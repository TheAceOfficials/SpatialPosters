using System;
using System.Collections.Generic;
using Jellyfin.Plugin.SpatialPosters.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.SpatialPosters;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public override string Name => "SpatialPosters";
    public override Guid Id => Guid.Parse("b7812903-8821-4d1a-8219-spatialposters01");
    public override string Description => "High-definition dynamic artwork engine & poster provider for Jellyfin.";

    public static Plugin? Instance { get; private set; }

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = "SpatialPosters",
                EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html"
            }
        };
    }
}
