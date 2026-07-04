try {
  // API modali strony głównej (ten sam styl co edytor)
  var _p = window.parent;
  if (_p && _p !== window) {
    _p.showAlertModal = _p.showAlertModal || alert;
  }
  var kit_dict = {
    defaultColor: "#FF6600",
    tools: [
      ["paint", "fa-paint-brush"],
      ["line", "fa-minus"],
      ["background", "fa-picture-o"],
      ["save", "fa-floppy-o"],
      ["delete", "fa-trash-o"],
    ],
    paints: [
      "#FFFFFF",
      "#FFFFCC",
      "#FFFF99",
      "#FFFF00",
      "#FF9900",
      "#FFCC00",
      "#FF6600",
      "#FF8080",
      "#FF0000",
      "#800000",
      "#FF99CC",
      "#FF00FF",
      "#CC99FF",
      "#9999FF",
      "#800080",
      "#660066",
      "#CCFFFF",
      "#00FFFF",
      "#99CCFF",
      "#00CCFF",
      "#0066CC",
      "#0000FF",
      "#000080",
      "#CCFFCC",
      "#99CC99",
      "#00FF00",
      "#99CC00",
      "#008000",
      "#003300",
      "#333300",
      "#CCCC99",
      "#808000",
      "#666633",
      "#FFCC99",
      "#FF9900",
      "#993366",
      "#C0C0C0",
      "#969696",
      "#808080",
      "#666699",
      "#333399",
      "#003366",
      "#339966",
      "#008080",
      "#333333",
      "#000000",
    ],
  };

  // Zmienne dla pędzla
  var clickX = new Array();
  var clickY = new Array();
  var clickDrag = new Array();
  var clickColor = new Array();
  var clickSize = new Array();

  // Zmienne dla linii
  var lines = new Array();
  var isDrawingLine = false;
  var lineStartX = 0;
  var lineStartY = 0;
  var currentLineEndX = 0;
  var currentLineEndY = 0;

  var paint;
  var toolSelected = "paint";

  // Ustawienia
  var strokeColorSetting = kit_dict.defaultColor;
  var strokeSizeSetting = 2;

  // Ustawienia siatki
  var gridSize = 30;
  var showGrid = true;
  var snapToGrid = true;

  // Elementy
  var canvas = document.getElementById("canvas");
  var control = document.getElementById("control");
  var context = canvas.getContext("2d");
  var brushDisplay = document.getElementById("brush");
  var brushSlider = document.getElementById("brush-slider");
  var colorDisplay = document.getElementById("color");
  var gridSizeDisplay = document.getElementById("grid-size");
  var gridSizeSlider = document.getElementById("grid-size-slider");
  var toggleGridBtn = document.getElementById("toggle-grid");
  var toggleSnapBtn = document.getElementById("toggle-snap");

  var paintList = document.getElementsByClassName("tool-thin");
  var toolList = document.getElementsByClassName("tool");
  var paintKit = document.getElementById("paints");
  var toolKit = document.getElementById("tools");

  // Funkcja aktualizacji rozmiaru płótna
  function updateCanvasSize() {
    var canvasPanel = document.querySelector(".canvas-panel");
    if (!canvasPanel) return;

    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    var tempCtx = tempCanvas.getContext("2d");
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = canvasPanel.clientWidth;
    canvas.height = canvasPanel.clientHeight;
    context.drawImage(tempCanvas, 0, 0);
    redraw(context);
  }

  // Inicjalizacja dokumentu
  function initializeDocument() {
    updateCanvasSize();

    for (const element of kit_dict["paints"]) {
      paintKit.innerHTML +=
        "<div class='tool-thin' style='background:" +
        element +
        "!important' " +
        "color='" +
        element +
        "'" +
        "></div>\n";
    }
    kit_dict["tools"].forEach((tool) => {
      toolKit.innerHTML += `<div class='tool' id='${tool[0]}'>
                            <i class='fa ${tool[1]}'></i>
                            <h2>${tool[0]}</h2>
                          </div>`;
    });

    var paintButton = document.getElementById("paint");
    var defaultSwatch = null;
    for (var i = 0; i < paintList.length; i++) {
      if (
        paintList[i].getAttribute("color").toUpperCase() ===
        kit_dict.defaultColor.toUpperCase()
      ) {
        defaultSwatch = paintList[i];
        break;
      }
    }
    (defaultSwatch || paintList[0]).classList.add("selected");
    colorDisplay.value = kit_dict.defaultColor;
    paintButton.classList.add("selected");

    redraw(context); // Rysuje siatkę na start
  }

  // Funkcja kalkulacji pozycji z systemem przyciągania
  function get_mouse_position(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    // Przeliczenie współrzędnych kursora na piksele wewnętrzne bufora canvasu
    var mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    var mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

    if (snapToGrid && gridSize > 0) {
      mouseX = Math.round(mouseX / gridSize) * gridSize;
      mouseY = Math.round(mouseY / gridSize) * gridSize;
    }

    return {
      x: mouseX,
      y: mouseY,
    };
  }

  function addClick(x, y, dragging) {
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
    clickColor.push(strokeColorSetting);
    clickSize.push(strokeSizeSetting);
  }

  function resetCanvas() {
    clickX = [];
    clickY = [];
    clickDrag = [];
    clickColor = [];
    clickSize = [];
    lines = [];
    canvas.style.background = "none";
  }

  function clearCanvas(context) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  function redraw(context) {
    clearCanvas(context);

    // Rysowanie siatki jako podkład
    if (showGrid && gridSize > 0) {
      context.beginPath();
      context.lineWidth = 1;

      let gridColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--canvas-grid-color")
        .trim();

      context.strokeStyle = gridColor;

      for (var x = 0; x <= canvas.width; x += gridSize) {
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
      }
      for (var y = 0; y <= canvas.height; y += gridSize) {
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
      }
      context.stroke();
      context.closePath();
    }

    context.lineJoin = "round";
    context.lineCap = "round";

    // Rysowanie pędzla
    for (var i = 0; i < clickX.length; i++) {
      context.lineWidth = clickSize[i];
      context.beginPath();
      if (clickDrag[i] && i) {
        context.moveTo(clickX[i - 1], clickY[i - 1]);
      } else {
        context.moveTo(clickX[i] - 1, clickY[i]);
      }
      context.lineTo(clickX[i], clickY[i]);
      context.closePath();
      context.strokeStyle = clickColor[i];
      context.stroke();
    }

    // Rysowanie zapisanych linii
    for (var j = 0; j < lines.length; j++) {
      var l = lines[j];
      context.lineWidth = l.size;
      context.strokeStyle = l.color;
      context.beginPath();
      context.moveTo(l.x1, l.y1);
      context.lineTo(l.x2, l.y2);
      context.stroke();
    }
  }

  // Główna funkcja
  initializeDocument();

  // Aktualizacja rozmiaru przy zmianie wielkości okna oraz po pełnym załadowaniu stylów
  window.addEventListener("resize", updateCanvasSize);
  window.addEventListener("load", updateCanvasSize);

  // Zdarzenia obszaru roboczego
  function handleStart(event) {
    const isTouch = event.type.includes("touch");
    const ev = isTouch ? event.touches[0] : event;
    const mouse_position = get_mouse_position(canvas, ev);

    if (toolSelected === "paint") {
      paint = true;
      addClick(mouse_position.x, mouse_position.y);
      redraw(context);
    } else if (toolSelected === "line") {
      isDrawingLine = true;
      lineStartX = mouse_position.x;
      lineStartY = mouse_position.y;
      currentLineEndX = mouse_position.x;
      currentLineEndY = mouse_position.y;
    } else if (toolSelected === "background") {
      canvas.style.background = strokeColorSetting;
    }
  }

  function handleMove(event) {
    if (event.type.includes("touch")) {
      event.preventDefault(); // Zapobiega przewijaniu na urządzeniach mobilnych
    }

    const isTouch = event.type.includes("touch");
    const ev = isTouch ? event.touches[0] : event;
    const mouse_position = get_mouse_position(canvas, ev);

    if (paint && toolSelected === "paint") {
      addClick(mouse_position.x, mouse_position.y, true);
      redraw(context);
    } else if (isDrawingLine && toolSelected === "line") {
      currentLineEndX = mouse_position.x;
      currentLineEndY = mouse_position.y;
      redraw(context);

      // Podgląd rysowanej na żywo linii
      context.beginPath();
      context.lineWidth = strokeSizeSetting;
      context.strokeStyle = strokeColorSetting;
      context.lineCap = "round";
      context.moveTo(lineStartX, lineStartY);
      context.lineTo(currentLineEndX, currentLineEndY);
      context.stroke();
    }
  }

  function handleEnd(event) {
    if (toolSelected === "paint") {
      paint = false;
    } else if (toolSelected === "line" && isDrawingLine) {
      isDrawingLine = false;
      // Zapisanie gotowej linii do tablicy
      lines.push({
        x1: lineStartX,
        y1: lineStartY,
        x2: currentLineEndX,
        y2: currentLineEndY,
        color: strokeColorSetting,
        size: strokeSizeSetting,
      });
      redraw(context);
    }
  }

  // Listenery canvasa
  canvas.addEventListener("mousedown", handleStart, false);
  canvas.addEventListener("mousemove", handleMove, false);
  canvas.addEventListener("mouseup", handleEnd, false);
  canvas.addEventListener("mouseleave", handleEnd, false);
  canvas.addEventListener("touchstart", handleStart, false);
  canvas.addEventListener("touchend", handleEnd, false);
  canvas.addEventListener("touchcancel", handleEnd, false);
  canvas.addEventListener("touchmove", handleMove, { passive: false });

  var clearButton = document.getElementById("delete");
  clearButton.addEventListener(
    "click",
    function (event) {
      clearCanvas(context);
      resetCanvas();
      redraw(context); // Przywraca siatkę po wyczyszczeniu
    },
    false,
  );

  var saveButton = document.getElementById("save");
  saveButton.addEventListener(
    "click",
    function (event) {
      var img = canvas.toDataURL("image/png");
      window.location = img;
    },
    false,
  );

  for (const element of paintList) {
    element.addEventListener(
      "click",
      function (event) {
        for (var i = 0; i < paintList.length; i++) {
          paintList[i].classList.remove("selected");
        }
        strokeColorSetting = this.getAttribute("color");
        colorDisplay.value = strokeColorSetting;
        this.classList.add("selected");
      },
      false,
    );
  }

  // Synchronizacja pędzla: tekst -> suwak
  brushDisplay.addEventListener(
    "input",
    function (event) {
      var val = parseInt(this.value) || 1;
      brushSlider.value = val;
      strokeSizeSetting = val;
    },
    false,
  );

  // Synchronizacja pędzla: suwak -> tekst
  brushSlider.addEventListener(
    "input",
    function (event) {
      brushDisplay.value = this.value;
      strokeSizeSetting = parseInt(this.value);
    },
    false,
  );

  colorDisplay.addEventListener(
    "change",
    function (event) {
      for (var i = 0; i < paintList.length; i++) {
        paintList[i].classList.remove("selected");
      }
      strokeColorSetting = this.value;
    },
    false,
  );

  // Event listenery dla siatki i przyciągania
  // Synchronizacja siatki: tekst -> suwak
  gridSizeDisplay.addEventListener(
    "input",
    function (event) {
      var val = parseInt(this.value) || 20;
      gridSizeSlider.value = val;
      gridSize = val;
      redraw(context);
    },
    false,
  );

  // Synchronizacja siatki: suwak -> tekst
  gridSizeSlider.addEventListener(
    "input",
    function (event) {
      gridSizeDisplay.value = this.value;
      gridSize = parseInt(this.value) || 20;
      redraw(context);
    },
    false,
  );

  toggleGridBtn.addEventListener("click", function () {
    showGrid = !showGrid;
    this.classList.toggle("selected", showGrid);
    this.innerText = showGrid ? "GRID: ON" : "GRID: OFF";
    redraw(context);
  });

  toggleSnapBtn.addEventListener("click", function () {
    snapToGrid = !snapToGrid;
    this.classList.toggle("selected", snapToGrid);
    this.innerText = snapToGrid ? "SNAP: ON" : "SNAP: OFF";
  });

  // Aktualizacja listenerów po wstrzyknięciu dynamicznym dla narzędzi
  setTimeout(() => {
    var dynamicToolList = document.getElementsByClassName("tool");
    for (var i = 0; i < dynamicToolList.length; i++) {
      dynamicToolList[i].addEventListener(
        "click",
        function (event) {
          for (const element of dynamicToolList) {
            element.classList.remove("selected");
          }
          toolSelected = this.getAttribute("id");
          this.classList.add("selected");
        },
        false,
      );
    }
  }, 100);
} catch (e) {
  console.error("JavaScript Error:", e);
}

// Funkcja przełączania motywu dark/light (domyślnie: CyberNova dark)
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute("theme") === "light";
  if (isLight) {
    html.removeAttribute("theme");
    localStorage.setItem("theme", "dark");
    setThemeIcon("dark");
  } else {
    html.setAttribute("theme", "light");
    localStorage.setItem("theme", "light");
    setThemeIcon("light");
  }
  redraw(context);
}

// Pomocnicza funkcja do ustawiania stanu przełącznika motywu
function setThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;

  btn.dataset.theme = theme;
  const value = btn.querySelector(".theme-toggle-value");
  if (value) {
    value.textContent = theme === "dark" ? "DARK" : "LIGHT";
  }
  btn.setAttribute(
    "aria-label",
    theme === "dark" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw",
  );
}

// Po załadowaniu strony: domyślnie dark (CyberNova), opcjonalnie light
(function () {
  const html = document.documentElement;
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    html.setAttribute("theme", "light");
    setTimeout(() => setThemeIcon("light"), 0);
  } else {
    html.removeAttribute("theme");
    setTimeout(() => setThemeIcon("dark"), 0);
  }
})();

const themeBtn = document.getElementById("theme-toggle-btn");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    toggleTheme();
  });
}
