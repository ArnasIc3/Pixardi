using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Pixardi.Data;
using Pixardi.Models;
using Microsoft.EntityFrameworkCore;

namespace Pixardi.Controllers
{
    [Authorize]
    public class AdminController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Canvas()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || !user.IsAdmin)
            {
                return Forbid();
            }

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ClearCanvas()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || !user.IsAdmin)
            {
                return Forbid();
            }

            _context.CanvasPixels.RemoveRange(_context.CanvasPixels);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Canvas cleared successfully" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeletePixel([FromBody] PixelCoordinates coords)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || !user.IsAdmin)
            {
                return Forbid();
            }

            var pixel = await _context.CanvasPixels
                .FirstOrDefaultAsync(p => p.X == coords.X && p.Y == coords.Y);

            if (pixel != null)
            {
                _context.CanvasPixels.Remove(pixel);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Pixel deleted successfully" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddPixel([FromBody] AdminPixelData pixelData)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || !user.IsAdmin)
            {
                return Forbid();
            }

            var existingPixel = await _context.CanvasPixels
                .FirstOrDefaultAsync(p => p.X == pixelData.X && p.Y == pixelData.Y);

            if (existingPixel != null)
            {
                existingPixel.Color = pixelData.Color;
                existingPixel.CreatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.CanvasPixels.Add(new CanvasPixel
                {
                    X = pixelData.X,
                    Y = pixelData.Y,
                    Color = pixelData.Color,
                    UserId = user.Id
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Pixel added successfully" });
        }
    }

    public class PixelCoordinates
    {
        public int X { get; set; }
        public int Y { get; set; }
    }

    public class AdminPixelData
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string Color { get; set; } = "";
    }
}