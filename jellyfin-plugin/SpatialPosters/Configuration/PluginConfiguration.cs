using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SpatialPosters.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public string ServerUrl { get; set; } = "https://spatialposters.vercel.app";
    public string Language { get; set; } = "en";
    public string ConfigToken { get; set; } = string.Empty;
    public string AdminToken { get; set; } = string.Empty;
    public bool ForceOverwriteExisting { get; set; } = false;
    public bool AutoSyncOnLibraryUpdate { get; set; } = true;
}
