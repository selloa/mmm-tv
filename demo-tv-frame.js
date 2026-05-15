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
    mute: 1,
    controls: 0,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    cc_load_policy: 0,
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

  function startPlayback(target) {
    if (!target || !target.playVideo) return;
    target.playVideo();
  }

  function tryUnmute(target) {
    if (!target || !target.unMute) return;
    target.unMute();
    target.setVolume(100);
  }

  function onPlayerReady(event) {
    startPlayback(event.target);
  }

  function onPlayerStateChange(event) {
    var YT = window.YT;
    if (YT && event.data === YT.PlayerState.PLAYING) {
      tryUnmute(event.target);
    }
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
          onStateChange: onPlayerStateChange,
        },
      });
    } else {
      player.loadVideoById({ videoId: vid, startSeconds: 0 });
      startPlayback(player);
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

    var root = document.querySelector(".tv-demo");
    if (root) {
      root.addEventListener("click", function () {
        tryUnmute(player);
        startPlayback(player);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
