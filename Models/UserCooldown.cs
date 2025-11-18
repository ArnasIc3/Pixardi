using System.ComponentModel.DataAnnotations;

namespace Pixardi.Models
{
    public class UserCooldown
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime LastPixelTime { get; set; }

        public virtual ApplicationUser? User { get; set; }
    }
}