using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace Pixardi.Hubs
{
    [Authorize]
    public class DrawingHub : Hub
    {
        public async Task JoinCanvas(string canvasId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Canvas-{canvasId}");
        }

        public async Task LeaveCanvas(string canvasId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Canvas-{canvasId}");
        }

        public async Task DrawPixel(string canvasId, int x, int y, string color)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";

            // Broadcast to all users in the canvas group
            await Clients.Group($"Canvas-{canvasId}").SendAsync("PixelDrawn", x, y, color, username);
        }
    }
}