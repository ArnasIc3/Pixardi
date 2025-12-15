using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace Pixardi.Hubs
{
    [Authorize]
    public class DrawingHub : Hub
    {
        private readonly ILogger<DrawingHub> _logger;

        public DrawingHub(ILogger<DrawingHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            _logger.LogInformation("SignalR: User {Username} connected. ConnectionId: {ConnectionId}",
                username, Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            _logger.LogInformation("SignalR: User {Username} disconnected. ConnectionId: {ConnectionId}",
                username, Context.ConnectionId);
            if (exception != null)
            {
                _logger.LogError(exception, "SignalR disconnection error");
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinCanvas(string canvasId)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            _logger.LogInformation("SignalR: User {Username} joined canvas {CanvasId}", username, canvasId);
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Canvas-{canvasId}");
        }

        public async Task LeaveCanvas(string canvasId)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            _logger.LogInformation("SignalR: User {Username} left canvas {CanvasId}", username, canvasId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Canvas-{canvasId}");
        }

        public async Task DrawPixel(string canvasId, int x, int y, string color)
        {
            var username = Context.User?.Identity?.Name ?? "Anonymous";
            _logger.LogInformation("SignalR: User {Username} drew pixel at ({X}, {Y}) with color {Color}",
                username, x, y, color);

            // Broadcast to all users in the canvas group
            await Clients.Group($"Canvas-{canvasId}").SendAsync("PixelDrawn", x, y, color, username);

            _logger.LogInformation("SignalR: Broadcasted pixel to Canvas-{CanvasId} group", canvasId);
        }
    }
}