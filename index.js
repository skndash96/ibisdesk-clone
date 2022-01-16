const [undoBtn, redoBtn] = document.getElementById("actionBox").children;
const [sizeMinusBtn, sizeTxt, sizePlusBtn] = document.getElementById("brushSizeBox").children;
const [scaleMinusBtn, scaleTxt, scalePlusBtn] = document.getElementById("canvasScaleBox").children;
const colorBtn = document.getElementById("colorBox").firstElementChild;
const colors = document.getElementById("colors");
const toggleBrushBtn = document.getElementById("toggleBrushBtn");

const canvas = document.getElementById("canvas");

const pathState = {
  lineWidth: 2,
  fillStyle: "#000000",
  strokeStyle: "#000000",
  globalCompositeOperation: "source-over",
};

const logs = {
  lineWidth: {
    pencil: 2,
    eraser: 10
  },
  tool: "pencil",
  scale: 1,
  offset: [0, 0],
  actions: [],
  undoneActions: [],
  ongoingAction: [],
  doubleTap: false
};


class App {
  redrawCanvas(arr = logs.actions, clear = true) {
    if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    for (let action of arr) {
      for (let [key, value] of Object.entries(action[0])) {
        ctx[key] = value;
      }
    
      ctx.beginPath();
      
      for (let [x, y] of action.slice(1)) {
        ctx.lineTo(...getCors(x, y));
      }
      
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }
  }
  
  
  set lineWidth(int) {
    pathState.lineWidth = int;
    
    sizeTxt.textContent = int.toString();
    
    logs.lineWidth[logs.tool] = int;
    
    return int;
  }
  
  
  set color(hex) {
    pathState.strokeStyle = hex;
    pathState.fillStyle = hex;
    
    colorBtn.style.borderColor = hex;
    
    return hex;
  }
  
  
  set globalCompositeOperation(str) {
    pathState.globalCompositeOperation = str;
    
    return str;
  }
  
  
  set scale([to, ...offset]) {
    logs.scale = to;
    logs.offset = offset;
    
    scaleTxt.textContent = to.toFixed(2);
    
    app.redrawCanvas();
  }
}


const ctx = canvas.getContext?.("2d");
const app = ctx ? new App() : null;


function setCanvas(evt) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}


function getCors(x, y) {
  return [
    (x+logs.offset[0])*logs.scale,
    (y+logs.offset[1])*logs.scale
  ];
}


function handleStart(evt) {
  evt.preventDefault();

  for (let [key, value] of Object.entries(pathState)) {
    ctx[key] = value;
  };
  
  if (evt.touches.length === 2) {
    logs.doubleTap = evt.touches;
  } else if (evt.touches.length === 1) {
    ctx.beginPath();
    
    logs.ongoingAction.push({
      ...pathState,
    });
  }
  
  logs.prevScale = logs.scale;
  logs.prevOffset = logs.offset;
}


function handleMove(evt) {
  evt.preventDefault();

  if (logs.doubleTap) {
    if (evt.touches.length !== 2) return;
    
    let [prevTouch1, prevTouch2] = logs.doubleTap;
    let [touch1, touch2] = evt.touches;
   
    let prevTouch1X = prevTouch1.clientX,
        prevTouch1Y = prevTouch1.clientY,
        prevTouch2X = prevTouch2.clientX,
        prevTouch2Y = prevTouch2.clientY;
    
    let touch1X = touch1.clientX,
        touch1Y = touch1.clientY,
        touch2X = touch2.clientX,
        touch2Y = touch2.clientY;
    
    let pMidX = (prevTouch1X+prevTouch2X)/2,
        pMidY = (prevTouch1Y+prevTouch2Y)/2,
        midX = (touch1X+touch2X)/2,
        midY = (touch1Y+touch2Y)/2;
    
    let hypo = Math.sqrt(Math.pow(touch1X-touch2X, 2) + Math.pow(touch1Y-touch2Y, 2));
    let prevHypo = Math.sqrt(Math.pow(prevTouch1X-prevTouch2X, 2) + Math.pow(prevTouch1Y-prevTouch2Y, 2));
    
    let scaleAmt = hypo/prevHypo;
    let scaleTo = logs.prevScale*scaleAmt;

    let offX = (midX-pMidX)/scaleTo + logs.prevOffset[0],
      offY = (midY-pMidY)*1.5 + logs.prevOffset[1];
    
    app.scale = [
      scaleTo,
      offX,
      offY
    ];
    
    return;
  } else if (
    evt.touches.length === 1 &&
    typeof logs.ongoingAction[0] === "object"
  ) for (let touch of evt.changedTouches) {
    let [x,y] = [touch.clientX, touch.clientY];
    
    ctx.lineTo(x, y);
    ctx.moveTo(x, y);
    ctx.stroke();
    
    logs.ongoingAction.push([
      x/logs.scale - logs.offset[0],
      y/logs.scale - logs.offset[1]
    ]);
  }
}


function handleEnd(evt) {
  evt.preventDefault();

  if (logs.doubleTap) {
    logs.doubleTap = false;
    logs.ongoingAction = [];
    return;
  };
  
  if (typeof logs.ongoingAction[0] === "object") {
    logs.actions.push(logs.ongoingAction);
    logs.ongoingAction = [];
    
    if (undoBtn.disabled) undoBtn.disabled = false;
    if (!redoBtn.disabled) redoBtn.disabled = true;
    if (logs.undoneActions.length) logs.undoneActions = [];
  }
}


if (app) {
  setCanvas();
  window.addEventListener("resize", setCanvas);
  
  colorBtn.addEventListener("click", (e) => {
    if (colors.matches(".hidden")) colors.classList.remove("hidden");
    else colors.classList.add("hidden");
  });
  
  colors.getElementsByClassName("color").forEach(el => {
    el.addEventListener("click", ({ target }) => {
      app.color = target.style.backgroundColor;
      colors.classList.add("hidden");
    });
  });
  
  sizeMinusBtn.addEventListener("click", () => {
    app.lineWidth = pathState.lineWidth-1;
  });
  
  sizePlusBtn.addEventListener("click", () => {
    app.lineWidth = pathState.lineWidth+1;
  });
  
  scaleMinusBtn.addEventListener("click", () => {
    let scaleTo = logs.scale-.1;
    app.scale = [
      scaleTo,
      ...logs.offset
    ];
  });
  
  scalePlusBtn.addEventListener("click", () => {
    let scaleTo = logs.scale+.1;
    app.scale = [
      scaleTo,
      ...logs.offset
    ];
  });
  
  toggleBrushBtn.addEventListener("click", () => {
    let toPencil = toggleBrushBtn.firstElementChild.matches(".disabled");
    
    if (toPencil) {
      toggleBrushBtn.firstElementChild.classList.remove("disabled");
      toggleBrushBtn.lastElementChild.classList.add("disabled");
      logs.tool = "pencil";
    } else {
      toggleBrushBtn.firstElementChild.classList.add("disabled");
      toggleBrushBtn.lastElementChild.classList.remove("disabled");
      logs.tool = "eraser";
    }
    
    app.globalCompositeOperation = toPencil
     ? "source-over"
     : "destination-out";
    app.lineWidth = logs.lineWidth[logs.tool];
  });
  
  undoBtn.addEventListener("click", () => {
    if (!logs.actions.length) return;
    
    let undoAction = logs.actions.pop();
    logs.undoneActions.push(undoAction);
    
    app.redrawCanvas();
    
    if (redoBtn.disabled) redoBtn.disabled = false;
    if (!logs.actions.length) undoBtn.disabled = true;
  });
  
  redoBtn.addEventListener("click", () => {
    if (!logs.undoneActions.length) return;
    
    let redoAction = logs.undoneActions.pop();
    logs.actions.push(redoAction);
    
    app.redrawCanvas([redoAction], false);
    
    if (!logs.undoneActions.length) redoBtn.disabled = true;
    if (undoBtn.disabled) undoBtn.disabled = false;
  });
  
  canvas.addEventListener("touchstart", handleStart);
  canvas.addEventListener("touchmove", handleMove);
  canvas.addEventListener("touchend", handleEnd);
}
