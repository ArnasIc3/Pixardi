using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pixardi.Data;
using Pixardi.Models;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text.Json;

namespace Pixardi.Controllers
{
    [Authorize]
    public class ProjectController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ProjectController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] SaveProjectRequest request)
        {
            try
            {
                var userId = _userManager.GetUserId(User);
                if (userId == null) return Unauthorized();

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Name == request.Name && p.UserId == userId);

                if (project == null)
                {
                    project = new Project
                    {
                        Name = request.Name,
                        UserId = userId,
                        Width = request.Width,
                        Height = request.Height
                    };
                    _context.Projects.Add(project);
                }

                project.CanvasData = JsonSerializer.Serialize(request.CanvasData);
                project.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Project saved successfully!" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error saving project: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Load(string name)
        {
            try
            {
                var userId = _userManager.GetUserId(User);
                if (userId == null) return Unauthorized();

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Name == name && p.UserId == userId);

                if (project == null)
                    return Json(new { success = false, message = "Project not found." });

                var canvasData = JsonSerializer.Deserialize<Dictionary<string, object>>(project.CanvasData);

                return Json(new
                {
                    success = true,
                    project = new
                    {
                        name = project.Name,
                        width = project.Width,
                        height = project.Height,
                        canvasData = canvasData,
                        createdAt = project.CreatedAt,
                        updatedAt = project.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error loading project: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            try
            {
                var userId = _userManager.GetUserId(User);
                if (userId == null) return Unauthorized();

                var projects = await _context.Projects
                    .Where(p => p.UserId == userId)
                    .OrderByDescending(p => p.UpdatedAt)
                    .Select(p => new
                    {
                        name = p.Name,
                        width = p.Width,
                        height = p.Height,
                        createdAt = p.CreatedAt,
                        updatedAt = p.UpdatedAt
                    })
                    .ToListAsync();

                return Json(new { success = true, projects });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error loading projects: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DownloadPng([FromBody] DownloadRequest request)
        {
            try
            {
                // Create bitmap from canvas data
                using var bitmap = new Bitmap(request.Width, request.Height);
                using var graphics = Graphics.FromImage(bitmap);

                // Fill with white background
                graphics.Clear(Color.White);

                // Draw pixels
                foreach (var pixel in request.PixelData)
                {
                    var color = ColorTranslator.FromHtml(pixel.Color);
                    using var brush = new SolidBrush(color);
                    graphics.FillRectangle(brush, pixel.X, pixel.Y, 1, 1);
                }

                // Convert to PNG bytes
                using var stream = new MemoryStream();
                bitmap.Save(stream, ImageFormat.Png);
                var pngBytes = stream.ToArray();

                return File(pngBytes, "image/png", $"{request.FileName ?? "pixardi-art"}.png");
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error generating PNG: {ex.Message}" });
            }
        }

        // TEST ENDPOINT - Create sample project for current user
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> CreateSample()
        {
            var userId = _userManager.GetUserId(User);

            // Create a simple test project
            var sampleProject = new Project
            {
                Name = "Test Heart",
                Width = 8,
                Height = 8,
                CanvasData = "{\"2,1\":\"#ff0000\",\"3,1\":\"#ff0000\",\"5,1\":\"#ff0000\",\"6,1\":\"#ff0000\",\"1,2\":\"#ff0000\",\"2,2\":\"#ff0000\",\"3,2\":\"#ff0000\",\"4,2\":\"#ff0000\",\"5,2\":\"#ff0000\",\"6,2\":\"#ff0000\",\"7,2\":\"#ff0000\",\"1,3\":\"#ff0000\",\"2,3\":\"#ff0000\",\"3,3\":\"#ff0000\",\"4,3\":\"#ff0000\",\"5,3\":\"#ff0000\",\"6,3\":\"#ff0000\",\"7,3\":\"#ff0000\",\"2,4\":\"#ff0000\",\"3,4\":\"#ff0000\",\"4,4\":\"#ff0000\",\"5,4\":\"#ff0000\",\"6,4\":\"#ff0000\",\"3,5\":\"#ff0000\",\"4,5\":\"#ff0000\",\"5,5\":\"#ff0000\",\"4,6\":\"#ff0000\"}",
                UserId = userId,
                IsPublic = false
            };

            _context.Projects.Add(sampleProject);
            await _context.SaveChangesAsync();

            return Json(new { success = true, message = "Sample project created! You can now test the Share button.", projectName = sampleProject.Name });
        }
    }

    public class SaveProjectRequest
    {
        public string Name { get; set; } = string.Empty;
        public int Width { get; set; }
        public int Height { get; set; }
        public Dictionary<string, object> CanvasData { get; set; } = new();
    }

    public class DownloadRequest
    {
        public string? FileName { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public List<PixelData> PixelData { get; set; } = new();
    }

    public class PixelData
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string Color { get; set; } = "#000000";
    }
}