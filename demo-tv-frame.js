(function () {
  "use strict";

  var CATALOG_URL = "source/vod_index.csv";

  var episodesWithVideo = [];
  var currentEpisode = null;
  var player = null;
  var ytApiReady = false;
  var catalogReady = false;

  var PLAYER_VARS = {
    autoplay: 1,
    rel: 0,
    modestbranding: 1,
    playsinline: 1,
    origin: window.location.origin,
  };

  function extractVideoId(url) {
    if (!url || typeof url !== "string") return null;
    var trimmed = url.trim();
    if (!trimmed) return null;
    try {
      var u = new URL(trimmed);
      if (u.hostname === "youtu.be") {
        var id = u.pathname.replace(/^\//, "").split("/")[0];
        return id || null;
      }
      if (u.hostname.includes("youtube.com")) {
        var v = u.searchParams.get("v");
        if (v) return v;
        var embed = u.pathname.match(/^\/embed\/([^/?]+)/);
        if (embed) return embed[1];
      }
    } catch (e) {
      /* fall through */
    }
    var m = trimmed.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  }

  function hasYoutubeWatchUrl(row) {
    return !!extractVideoId(row.youtube_longplay_url || "");
  }

  function pickRandomEpisode(excludeCatalogId) {
    if (!episodesWithVideo.length) return null;
    var pool = episodesWithVideo.filter(function (e) {
      return e.catalog_id !== excludeCatalogId;
    });
    var list = pool.length ? pool : episodesWithVideo;
    return list[Math.floor(Math.random() * list.length)];
  }

  function onPlayerReady(event) {
    event.target.unMute();
    event.target.setVolume(100);
    event.target.playVideo();
  }

  function createOrLoadEpisode(ep) {
    if (!ep || !ytApiReady) return;
    var vid = extractVideoId(ep.youtube_longplay_url);
    if (!vid) return;

    currentEpisode = ep;

    if (!player) {
      player = new window.YT.Player("player", {
        width: "100%",
        height: "100%",
        videoId: vid,
        playerVars: PLAYER_VARS,
        events: {
          onReady: onPlayerReady,
        },
      });
    } else {
      player.loadVideoById({ videoId: vid, startSeconds: 0 });
      player.unMute();
      player.setVolume(100);
      player.playVideo();
    }
  }

  function tryStartPlayback() {
    if (!catalogReady || !ytApiReady) return;
    if (!episodesWithVideo.length) {
      console.warn("No episodes with a YouTube URL in the catalog.");
      return;
    }
    if (!currentEpisode) {
      currentEpisode = pickRandomEpisode(null);
    }
    if (!player) {
      createOrLoadEpisode(currentEpisode);
    }
  }

  function loadCatalog() {
    fetch(CATALOG_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        var parsed = window.Papa.parse(text, {
          header: true,
          skipEmptyLines: "greedy",
        });
        if (parsed.errors && parsed.errors.length) {
          console.warn(parsed.errors);
        }
        episodesWithVideo = (parsed.data || []).filter(hasYoutubeWatchUrl);
        catalogReady = true;
        tryStartPlayback();
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  window.onYouTubeIframeAPIReady = function () {
    ytApiReady = true;
    tryStartPlayback();
  };

  function init() {
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
    }

    if (!window.Papa) {
      console.error("Papa Parse failed to load.");
      return;
    }

    loadCatalog();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
