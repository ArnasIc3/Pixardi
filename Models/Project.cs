using System.ComponentModel.DataAnnotations;

namespace Pixardi.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public int Width { get; set; }
        public int Height { get; set; }

        [Required]
        public string CanvasData { get; set; }

        [Required]
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Social features
        public bool IsPublic { get; set; } = false;
        public int Views { get; set; } = 0;

        // Navigation properties
        public List<Like> Likes { get; set; } = new();
        public List<Comment> Comments { get; set; } = new();

        // Computed property
        public int LikesCount => Likes?.Count ?? 0;
        public int CommentsCount => Comments?.Count ?? 0;
    }
}