using System.ComponentModel.DataAnnotations;

namespace Pixardi.Models
{
    public class Comment
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Content { get; set; }

        [Required]
        public int ProjectId { get; set; }
        public Project Project { get; set; }

        [Required]
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}