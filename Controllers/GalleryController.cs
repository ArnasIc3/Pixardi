using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pixardi.Data;
using Pixardi.Models;

namespace Pixardi.Controllers
{
    public class GalleryController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public GalleryController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: /Gallery
        public async Task<IActionResult> Index(string sort = "recent")
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var currentUser = await _userManager.GetUserAsync(User);
                if (currentUser != null)
                {
                    // Use DisplayName if available, otherwise fall back to email
                    ViewData["UserDisplayName"] = !string.IsNullOrEmpty(currentUser.DisplayName)
                        ? currentUser.DisplayName
                        : currentUser.Email?.Split('@')[0]; // Use part before @ if no display name
                }
            }

            var query = _context.Projects
                .Where(p => p.IsPublic)
                .Include(p => p.User)
                .Include(p => p.Likes)
                .Include(p => p.Comments)
                .AsQueryable();

            // Sorting
            query = sort switch
            {
                "popular" => query.OrderByDescending(p => p.LikesCount).ThenByDescending(p => p.Views),
                "views" => query.OrderByDescending(p => p.Views),
                "recent" => query.OrderByDescending(p => p.CreatedAt),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var projects = await query.Take(50).ToListAsync();

            ViewData["CurrentSort"] = sort;
            return View(projects);
        }

        // GET: /Gallery/Details/5
        public async Task<IActionResult> Details(int id)
        {
            var project = await _context.Projects
                .Include(p => p.User)
                .Include(p => p.Likes)
                    .ThenInclude(l => l.User)
                .Include(p => p.Comments)
                    .ThenInclude(c => c.User)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsPublic);

            if (project == null)
            {
                return NotFound();
            }

            // Increment view count
            project.Views++;
            await _context.SaveChangesAsync();

            // Check if current user liked this project
            ViewBag.UserHasLiked = false;
            if (User.Identity.IsAuthenticated)
            {
                var userId = _userManager.GetUserId(User);
                ViewBag.UserHasLiked = await _context.Likes
                    .AnyAsync(l => l.ProjectId == id && l.UserId == userId);
            }

            return View(project);
        }

        // POST: /Gallery/Like/5
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Like(int id)
        {
            var userId = _userManager.GetUserId(User);
            var project = await _context.Projects.FindAsync(id);

            if (project == null || !project.IsPublic)
            {
                return Json(new { success = false, message = "Project not found" });
            }

            // Check if already liked
            var existingLike = await _context.Likes
                .FirstOrDefaultAsync(l => l.ProjectId == id && l.UserId == userId);

            if (existingLike != null)
            {
                // Unlike
                _context.Likes.Remove(existingLike);
                await _context.SaveChangesAsync();

                var newCount = await _context.Likes.CountAsync(l => l.ProjectId == id);
                return Json(new { success = true, liked = false, count = newCount });
            }
            else
            {
                // Like
                var like = new Like
                {
                    ProjectId = id,
                    UserId = userId
                };

                _context.Likes.Add(like);
                await _context.SaveChangesAsync();

                var newCount = await _context.Likes.CountAsync(l => l.ProjectId == id);
                return Json(new { success = true, liked = true, count = newCount });
            }
        }

        // POST: /Gallery/Comment
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddComment(int projectId, string content)
        {
            if (string.IsNullOrWhiteSpace(content) || content.Length > 500)
            {
                return Json(new { success = false, message = "Invalid comment" });
            }

            var project = await _context.Projects.FindAsync(projectId);
            if (project == null || !project.IsPublic)
            {
                return Json(new { success = false, message = "Project not found" });
            }

            var userId = _userManager.GetUserId(User);
            var user = await _userManager.FindByIdAsync(userId);

            var comment = new Comment
            {
                ProjectId = projectId,
                UserId = userId,
                Content = content.Trim()
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            return Json(new
            {
                success = true,
                comment = new
                {
                    id = comment.Id,
                    content = comment.Content,
                    userName = user.DisplayName ?? user.Email,
                    createdAt = comment.CreatedAt.ToString("MMM dd, yyyy 'at' HH:mm")
                }
            });
        }

        // POST: /Gallery/TogglePublic/ProjectName
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> TogglePublic(string id)
        {
            var userId = _userManager.GetUserId(User);
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.Name == id && p.UserId == userId);

            if (project == null)
            {
                return Json(new { success = false, message = "Project not found" });
            }

            project.IsPublic = !project.IsPublic;
            await _context.SaveChangesAsync();

            return Json(new { success = true, isPublic = project.IsPublic, projectName = project.Name });
        }

        // TEST ENDPOINT 
        public async Task<IActionResult> CreateSampleData()
        {
            if (_context.Projects.Any(p => p.IsPublic))
            {
                return Json(new { message = "Sample data already exists" });
            }

            // Get first user from database
            var user = await _context.Users.FirstAsync();

            // Create sample projects
            var projects = new List<Project>
            {
                new Project
                {
                    Name = "Pixel Heart",
                    Width = 8,
                    Height = 8,
                    CanvasData = "{\"2,1\":\"#ff0000\",\"3,1\":\"#ff0000\",\"5,1\":\"#ff0000\",\"6,1\":\"#ff0000\",\"1,2\":\"#ff0000\",\"2,2\":\"#ff0000\",\"3,2\":\"#ff0000\",\"4,2\":\"#ff0000\",\"5,2\":\"#ff0000\",\"6,2\":\"#ff0000\",\"7,2\":\"#ff0000\",\"1,3\":\"#ff0000\",\"2,3\":\"#ff0000\",\"3,3\":\"#ff0000\",\"4,3\":\"#ff0000\",\"5,3\":\"#ff0000\",\"6,3\":\"#ff0000\",\"7,3\":\"#ff0000\",\"2,4\":\"#ff0000\",\"3,4\":\"#ff0000\",\"4,4\":\"#ff0000\",\"5,4\":\"#ff0000\",\"6,4\":\"#ff0000\",\"3,5\":\"#ff0000\",\"4,5\":\"#ff0000\",\"5,5\":\"#ff0000\",\"4,6\":\"#ff0000\"}",
                    UserId = user.Id,
                    User = user,
                    IsPublic = true,
                    Views = 15,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new Project
                {
                    Name = "Smiley Face",
                    Width = 10,
                    Height = 10,
                    CanvasData = "{\"2,2\":\"#000000\",\"3,2\":\"#000000\",\"6,2\":\"#000000\",\"7,2\":\"#000000\",\"2,6\":\"#000000\",\"3,6\":\"#000000\",\"4,6\":\"#000000\",\"5,6\":\"#000000\",\"6,6\":\"#000000\",\"7,6\":\"#000000\",\"3,7\":\"#000000\",\"6,7\":\"#000000\"}",
                    UserId = user.Id,
                    User = user,
                    IsPublic = true,
                    Views = 8,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new Project
                {
                    Name = "Pixel Tree",
                    Width = 12,
                    Height = 12,
                    CanvasData = "{\"5,1\":\"#00ff00\",\"6,1\":\"#00ff00\",\"4,2\":\"#00ff00\",\"5,2\":\"#00ff00\",\"6,2\":\"#00ff00\",\"7,2\":\"#00ff00\",\"3,3\":\"#00ff00\",\"4,3\":\"#00ff00\",\"5,3\":\"#00ff00\",\"6,3\":\"#00ff00\",\"7,3\":\"#00ff00\",\"8,3\":\"#00ff00\",\"5,4\":\"#8B4513\",\"6,4\":\"#8B4513\",\"5,5\":\"#8B4513\",\"6,5\":\"#8B4513\",\"5,6\":\"#8B4513\",\"6,6\":\"#8B4513\",\"5,7\":\"#8B4513\",\"6,7\":\"#8B4513\"}",
                    UserId = user.Id,
                    User = user,
                    IsPublic = true,
                    Views = 22,
                    CreatedAt = DateTime.UtcNow.AddHours(-6)
                }
            };

            _context.Projects.AddRange(projects);
            await _context.SaveChangesAsync();

            return Json(new { message = "Sample data created successfully!", count = projects.Count });
        }
    }
}