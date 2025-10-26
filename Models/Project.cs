using System.ComponentModel.DataAnnotations;

namespace Pixardi.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public string CanvasData { get; set; } = string.Empty; // JSON serialized pixel data

        public int Width { get; set; }
        public int Height { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property to link back to the user who created this project
        public virtual ApplicationUser User { get; set; } = null!;
    }
}