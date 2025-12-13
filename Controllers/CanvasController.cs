using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Pixardi.Data;
using Pixardi.Models;
using Microsoft.EntityFrameworkCore;

namespace Pixardi.Controllers
{
    [Authorize]
    public class CanvasController : Controller
    {
        private readonly ApplicationDbContext _context;

        public CanvasController(ApplicationDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SavePixel([FromBody] PixelData pixelData)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Check cooldown
            var userCooldown = await _context.UserCooldowns
                .FirstOrDefaultAsync(c => c.UserId == userId);

            var now = DateTime.UtcNow;
            var cooldownSeconds = 30;

            if (userCooldown != null)
            {
                var timeSinceLastPixel = now - userCooldown.LastPixelTime;
                if (timeSinceLastPixel.TotalSeconds < cooldownSeconds)
                {
                    var remainingTime = TimeSpan.FromSeconds(cooldownSeconds) - timeSinceLastPixel;
                    return BadRequest(new
                    {
                        message = "Cooldown active",
                        remainingSeconds = (int)remainingTime.TotalSeconds
                    });
                }
            }

            // Save pixel
            var existingPixel = await _context.CanvasPixels
                .FirstOrDefaultAsync(p => p.X == pixelData.X && p.Y == pixelData.Y);

            if (existingPixel != null)
            {
                existingPixel.Color = pixelData.Color;
                existingPixel.UserId = userId;
                existingPixel.CreatedAt = now;
            }
            else
            {
                _context.CanvasPixels.Add(new CanvasPixel
                {
                    X = pixelData.X,
                    Y = pixelData.Y,
                    Color = pixelData.Color,
                    UserId = userId
                });
            }

            // Update cooldown
            if (userCooldown != null)
            {
                userCooldown.LastPixelTime = now;
            }
            else
            {
                _context.UserCooldowns.Add(new UserCooldown
                {
                    UserId = userId,
                    LastPixelTime = now
                });
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetCooldownStatus()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { canPlace = true, remainingSeconds = 0 });
            }

            var userCooldown = await _context.UserCooldowns
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (userCooldown == null)
            {
                return Json(new { canPlace = true, remainingSeconds = 0 });
            }

            var now = DateTime.UtcNow;
            var timeSinceLastPixel = now - userCooldown.LastPixelTime;
            var cooldownSeconds = 30;

            if (timeSinceLastPixel.TotalSeconds >= cooldownSeconds)
            {
                return Json(new { canPlace = true, remainingSeconds = 0 });
            }

            var remainingTime = TimeSpan.FromSeconds(cooldownSeconds) - timeSinceLastPixel;
            return Json(new { canPlace = false, remainingSeconds = (int)remainingTime.TotalSeconds });
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetCanvas()
        {
            var pixels = await _context.CanvasPixels.ToListAsync();
            return Json(pixels);
        }
    }
}