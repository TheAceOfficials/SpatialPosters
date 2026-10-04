using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.SpatialPosters.Configuration;
using Jellyfin.Plugin.SpatialPosters.Providers;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Tasks;

namespace Jellyfin.Plugin.SpatialPosters.ScheduledTasks;

public class SpatialPostersSyncTask : IScheduledTask
{
    private readonly ILibraryManager _libraryManager;
    private readonly SpatialPostersImageProvider _imageProvider;

    public SpatialPostersSyncTask(ILibraryManager libraryManager, SpatialPostersImageProvider imageProvider)
    {
        _libraryManager = libraryManager;
        _imageProvider = imageProvider;
    }

    public string Name => "Sync SpatialPosters Artwork";
    public string Key => "SpatialPostersSyncTask";
    public string Description => "Fetches and applies dynamic high-definition SpatialPosters artwork across your Jellyfin media libraries.";
    public string Category => "Metadata";

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        return new[]
        {
            new TaskTriggerInfo
            {
                Type = TaskTriggerInfo.TriggerDaily,
                TimeOfDayTicks = TimeSpan.FromHours(3).Ticks
            }
        };
    }

    public async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var items = _libraryManager.GetItemList(new InternalItemsQuery
        {
            IncludeItemTypes = new[] { BaseItemKind.Movie, BaseItemKind.Series },
            IsVirtualItem = false
        });

        if (items.Count == 0)
        {
            progress.Report(100);
            return;
        }

        for (int i = 0; i < items.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var item = items[i];

            if (!config.ForceOverwriteExisting && item.HasImage(ImageType.Primary))
            {
                progress.Report((double)(i + 1) / items.Count * 100);
                continue;
            }

            var images = await _imageProvider.GetImages(item, cancellationToken);
            foreach (var img in images)
            {
                if (img.Type == ImageType.Primary && !string.IsNullOrEmpty(img.Url))
                {
                    await _libraryManager.ConvertImageToLocal(item, img.Url, ImageType.Primary, cancellationToken);
                    item.UpdateToRepository(ItemUpdateType.ImageUpdate);
                    break;
                }
            }

            progress.Report((double)(i + 1) / items.Count * 100);
        }
    }
}
