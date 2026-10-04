using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.SpatialPosters.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.IO;
using MediaBrowser.Model.Tasks;

namespace Jellyfin.Plugin.SpatialPosters.ScheduledTasks;

public class SpatialPostersSyncTask : IScheduledTask
{
    private readonly ILibraryManager _libraryManager;
    private readonly IProviderManager _providerManager;
    private readonly IFileSystem _fileSystem;

    public SpatialPostersSyncTask(
        ILibraryManager libraryManager,
        IProviderManager providerManager,
        IFileSystem fileSystem)
    {
        _libraryManager = libraryManager;
        _providerManager = providerManager;
        _fileSystem = fileSystem;
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

        var refreshOptions = new MetadataRefreshOptions(new DirectoryService(_fileSystem))
        {
            ImageRefreshMode = MetadataRefreshMode.FullRefresh,
            MetadataRefreshMode = MetadataRefreshMode.None,
            ReplaceAllImages = config.ForceOverwriteExisting
        };

        for (int i = 0; i < items.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var item = items[i];

            if (!config.ForceOverwriteExisting && item.HasImage(ImageType.Primary))
            {
                progress.Report((double)(i + 1) / items.Count * 100);
                continue;
            }

            await _providerManager.RefreshFullItem(item, refreshOptions, cancellationToken).ConfigureAwait(false);

            progress.Report((double)(i + 1) / items.Count * 100);
        }
    }
}
