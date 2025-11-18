using System.ComponentModel.DataAnnotations;

namespace Pixardi.Models
{
    public class CanvasPixel
    {
        public int Id { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public string Color { get; set; } = "#FFFFFF";
        public string UserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ApplicationUser? User { get; set; }
    }
    public class PixelData
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string Color { get; set; } = "";
    }
}