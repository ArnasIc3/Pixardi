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