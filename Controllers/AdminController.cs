using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Pixardi.Data;
using Pixardi.Models;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

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

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ImportImage(IFormFile imageFile, int startX, int startY, int maxWidth)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || !user.IsAdmin)
            {
                return Forbid();
            }

            if (imageFile == null || imageFile.Length == 0)
            {
                return BadRequest(new { message = "No image file provided" });
            }

            // Validate file type
            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".gif", ".bmp" };
            var fileExtension = Path.GetExtension(imageFile.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest(new { message = "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP" });
            }

            // Limit file size to 5MB
            if (imageFile.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "File size exceeds 5MB limit" });
            }

            try
            {
                // Read the entire file into a byte array
                byte[] imageBytes;
                using (var stream = imageFile.OpenReadStream())
                using (var memoryStream = new MemoryStream())
                {
                    await stream.CopyToAsync(memoryStream);
                    imageBytes = memoryStream.ToArray();
                }

                // Log the file size for debugging
                Console.WriteLine($"Image file size: {imageBytes.Length} bytes");
                Console.WriteLine($"First few bytes: {string.Join(", ", imageBytes.Take(10).Select(b => b.ToString("X2")))}");

                // Check for AVIF format (unsupported)
                if (imageBytes.Length > 8 &&
                    imageBytes[4] == 0x66 && imageBytes[5] == 0x74 &&
                    imageBytes[6] == 0x79 && imageBytes[7] == 0x70)
                {
                    return BadRequest(new { message = "AVIF format is not supported. Please convert your image to PNG, JPEG, GIF, BMP, or WebP format." });
                }

                // Load image from byte array
                using var image = Image.Load<Rgba32>(imageBytes);

                // Calculate scaled dimensions
                int targetWidth = maxWidth > 0 ? Math.Min(maxWidth, image.Width) : image.Width;
                int targetHeight = (int)((double)targetWidth / image.Width * image.Height);

                // Resize image if needed
                if (targetWidth != image.Width)
                {
                    image.Mutate(x => x.Resize(targetWidth, targetHeight));
                }

                // Convert image to pixels
                var pixelsToAdd = new List<CanvasPixel>();

                for (int y = 0; y < image.Height; y++)
                {
                    for (int x = 0; x < image.Width; x++)
                    {
                        var pixel = image[x, y];

                        // Skip transparent or nearly transparent pixels
                        if (pixel.A < 128)
                            continue;

                        var color = $"#{pixel.R:X2}{pixel.G:X2}{pixel.B:X2}";
                        var canvasX = startX + x;
                        var canvasY = startY + y;

                        // Check if pixel is within canvas bounds (assuming 1000x600 canvas)
                        if (canvasX >= 0 && canvasX < 200 && canvasY >= 0 && canvasY < 120)
                        {
                            pixelsToAdd.Add(new CanvasPixel
                            {
                                X = canvasX * 5,
                                Y = canvasY * 5,
                                Color = color,
                                UserId = user.Id,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }

                // Batch update pixels
                foreach (var pixelToAdd in pixelsToAdd)
                {
                    var existingPixel = await _context.CanvasPixels
                        .FirstOrDefaultAsync(p => p.X == pixelToAdd.X && p.Y == pixelToAdd.Y);

                    if (existingPixel != null)
                    {
                        existingPixel.Color = pixelToAdd.Color;
                        existingPixel.CreatedAt = pixelToAdd.CreatedAt;
                    }
                    else
                    {
                        _context.CanvasPixels.Add(pixelToAdd);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Image imported successfully",
                    pixelsAdded = pixelsToAdd.Count,
                    width = image.Width,
                    height = image.Height
                });
            }
            catch (Exception ex)
            {
                var errorMessage = $"Error processing image: {ex.Message}";
                if (ex.InnerException != null)
                {
                    errorMessage += $" | Inner: {ex.InnerException.Message}";
                }
                Console.WriteLine($"Image import error: {errorMessage}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest(new { message = errorMessage });
            }
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