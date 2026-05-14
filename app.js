(function () {
  "use strict";

  var CATALOG_URL = "source/vod_index.csv";

  var episodesWithVideo = [];
  var currentEpisode = null;
  var player = null;
  var ytApiReady = false;
  var catalogReady = false;

  var elMeta = null;
  var elPlayPause = null;
  var elNext = null;
  var elStatus = null;

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

  function setStatus(msg) {
    if (elStatus) elStatus.textContent = msg || "";
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkOrDash(url, label) {
    var t = (url || "").trim();
    if (!t) return "<span class=\"meta-dash\">—</span>";
    return (
      '<a href="' +
      esc(t) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(label) +
      "</a>"
    );
  }

  function renderMetadata(ep) {
    if (!elMeta || !ep) return;
    var rows = [
      ["catalog_id", ep.catalog_id || "—"],
      ["category", ep.category || "—"],
      ["title", ep.title || "—"],
      ["release_date", ep.release_date || "—"],
      ["authors", ep.authors || "—"],
      ["Stream", linkOrDash("https://www.youtube.com/c/amigamaster", "AmigaMaster")],
      ["wiki_url", linkOrDash(ep.wiki_url_mmm, "Wiki")],
      ["game_download", linkOrDash(ep.download_url_mmm_docman, "Download")],
    ];
    elMeta.innerHTML = rows
      .map(function (pair) {
        return (
          '<div class="meta-row"><dt>' +
          esc(pair[0]) +
          "</dt><dd>" +
          pair[1] +
          "</dd></div>"
        );
      })
      .join("");
  }

  function updatePlayPauseLabel() {
    if (!elPlayPause || !player || !player.getPlayerState) return;
    var st = player.getPlayerState();
    var YT = window.YT;
    var playing = YT && st === YT.PlayerState.PLAYING;
    elPlayPause.textContent = playing ? "Pause" : "Play";
    elPlayPause.setAttribute("aria-pressed", playing ? "true" : "false");
  }

  function onPlayerStateChange() {
    updatePlayPauseLabel();
  }

  function createOrLoadEpisode(ep) {
    if (!ep || !ytApiReady) return;
    var vid = extractVideoId(ep.youtube_longplay_url);
    if (!vid) {
      setStatus("No valid YouTube URL for this row.");
      return;
    }
    currentEpisode = ep;
    renderMetadata(ep);

    if (!player) {
      player = new window.YT.Player("player", {
        width: "100%",
        height: "100%",
        videoId: vid,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: function () {
            updatePlayPauseLabel();
            setStatus("");
          },
          onStateChange: onPlayerStateChange,
        },
      });
    } else {
      player.loadVideoById({ videoId: vid, startSeconds: 0 });
      updatePlayPauseLabel();
    }
  }

  function tryStartPlayback() {
    if (!catalogReady || !ytApiReady) return;
    if (!episodesWithVideo.length) {
      setStatus("No episodes with a YouTube URL in the catalog.");
      return;
    }
    if (!currentEpisode) {
      currentEpisode = pickRandomEpisode(null);
    }
    if (!player) {
      createOrLoadEpisode(currentEpisode);
    }
  }

  function onPlayPauseClick() {
    if (!player || !player.getPlayerState) return;
    var YT = window.YT;
    var st = player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    updatePlayPauseLabel();
  }

  function onNextClick() {
    if (!episodesWithVideo.length) return;
    var next = pickRandomEpisode(currentEpisode ? currentEpisode.catalog_id : null);
    if (!next) return;
    currentEpisode = next;
    createOrLoadEpisode(next);
  }

  function loadCatalog() {
    setStatus("Loading catalog…");
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
        setStatus("Catalog loaded.");
        tryStartPlayback();
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          "Could not load catalog. Serve this folder over HTTP (e.g. npx serve) so source/vod_index.csv can be fetched."
        );
      });
  }

  window.onYouTubeIframeAPIReady = function () {
    ytApiReady = true;
    tryStartPlayback();
  };

  function init() {
    elMeta = document.getElementById("meta-panel");
    elPlayPause = document.getElementById("btn-play-pause");
    elNext = document.getElementById("btn-next");
    elStatus = document.getElementById("status-line");

    if (window.YT && window.YT.Player) {
      ytApiReady = true;
    }

    if (elPlayPause) elPlayPause.addEventListener("click", onPlayPauseClick);
    if (elNext) elNext.addEventListener("click", onNextClick);

    if (!window.Papa) {
      setStatus("Papa Parse failed to load.");
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
