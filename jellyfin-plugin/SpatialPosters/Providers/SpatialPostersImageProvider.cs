using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.SpatialPosters.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Providers;

namespace Jellyfin.Plugin.SpatialPosters.Providers;

public class SpatialPostersImageProvider : IRemoteImageProvider
{
    private readonly IHttpClientFactory _httpClientFactory;

    public SpatialPostersImageProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public string Name => "SpatialPosters";

    public bool Supports(BaseItem item)
    {
        return item is Movie || item is Series || item is Season;
    }

    public IEnumerable<ImageType> GetSupportedImages(BaseItem item)
    {
        return new[] { ImageType.Primary };
    }

    public async Task<IEnumerable<RemoteImageInfo>> GetImages(BaseItem item, CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var serverUrl = string.IsNullOrWhiteSpace(config.ServerUrl)
            ? "https://spatialposters.vercel.app"
            : config.ServerUrl.TrimEnd('/');

        var tmdbId = item.GetProviderId(MetadataProvider.Tmdb);
        var mediaType = item is Series || item is Season ? "tv" : "movie";

        if (string.IsNullOrEmpty(tmdbId))
        {
            return Array.Empty<RemoteImageInfo>();
        }

        var lang = string.IsNullOrWhiteSpace(config.Language) ? "en" : config.Language;
        var imageUrl = $"{serverUrl}/api/poster/{mediaType}/{tmdbId}?lang={lang}";

        if (!string.IsNullOrWhiteSpace(config.ConfigToken))
        {
            imageUrl += $"&u={Uri.EscapeDataString(config.ConfigToken)}";
        }

        var images = new List<RemoteImageInfo>
        {
            new RemoteImageInfo
            {
                Url = imageUrl,
                ThumbnailUrl = imageUrl,
                ProviderName = Name,
                Type = ImageType.Primary,
                Language = lang
            }
        };

        return await Task.FromResult(images);
    }

    public async Task<HttpResponseMessage> GetImageResponse(string url, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        return await client.GetAsync(url, cancellationToken);
    }
}
