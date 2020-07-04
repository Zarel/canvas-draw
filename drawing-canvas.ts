/**
 * Drawing canvas
 */

interface Stroke {
  color: string;
  width: number;
  points: [number, number][],
}

function h<T extends HTMLElement = HTMLElement>(
  tagName: string | T, attrs?: Omit<Partial<T>, 'style'> & {style?: Partial<T['style']>}, children?: (HTMLElement | string)[]
): T {
  const elem = typeof tagName === 'string' ? document.createElement(tagName) as T : tagName;
  if (attrs) Object.assign(elem, attrs);
  if (attrs && attrs.style) Object.assign(elem.style, attrs.style);
  if (children) for (const child of children) {
    elem.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return elem;
}

class DrawingCanvas {
  wrapper: HTMLDivElement;

  /** mostly just holds the cursor */
  interfaceCanvas: HTMLCanvasElement;
  currentStrokeCanvas: HTMLCanvasElement;
  drawingCanvas: HTMLCanvasElement;

  interfaceContext: CanvasRenderingContext2D;
  currentStrokeContext: CanvasRenderingContext2D;
  drawingContext: CanvasRenderingContext2D;

  strokes: Stroke[] = [];
  currentStroke: Stroke | null = null;

  w = 320;
  h = 320;

  strokeWidth = 2;
  strokeColor = 'black';

  constructor(wrapper?: HTMLDivElement | null) {
    if (wrapper && wrapper.offsetHeight > 2 && wrapper.offsetWidth > 2) {
      this.w = Math.round(wrapper.offsetWidth);
      this.h = Math.round(wrapper.offsetHeight);
    }
    if (!wrapper) wrapper = document.createElement('div');
    wrapper.innerHTML = '';

    const styleWidth = `${this.w}px`;
    const styleHeight = `${this.h}px`;

    this.wrapper = h(wrapper, undefined, [
      h<HTMLDivElement>('div', {style: {width: styleWidth, height: styleHeight, border: `1px solid gray`, marginBottom: '4px'}}, [
        (this.drawingCanvas = h<HTMLCanvasElement>('canvas', {
          width: this.w,
          height: this.h,
          style: {width: styleWidth, height: styleHeight, display: 'block', position: 'absolute'},
        })),

        (this.currentStrokeCanvas = h<HTMLCanvasElement>('canvas', {
          width: this.w,
          height: this.h,
          style: {width: styleWidth, height: styleHeight, display: 'block', position: 'absolute'},
        })),
    
        (this.interfaceCanvas = h<HTMLCanvasElement>('canvas', {
          width: this.w,
          height: this.h,
          style: {width: styleWidth, height: styleHeight, display: 'block', position: 'absolute', cursor: 'crosshair'},
          onmousedown: this.mousedown,
          onmousemove: this.mousemove,
          onmouseup: this.mouseup,
          onmouseout: this.mouseup,
          ontouchstart: this.mousedown,
          ontouchmove: this.mousemove,
          ontouchend: this.mouseup,
          ontouchcancel: this.mouseup,
        })),
      ]),

      h<HTMLButtonElement>('button', {onclick: this.clickColor, value: "black"}, ["Black"]),
      " ",
      h<HTMLButtonElement>('button', {onclick: this.clickColor, value: "Red"}, ["Red"]),
      " ",
      h('button', {onclick: this.undo}, ["Undo"]),
    ]);

    this.interfaceContext = this.interfaceCanvas.getContext('2d')!;
    this.currentStrokeContext = this.currentStrokeCanvas.getContext('2d')!;
    this.drawingContext = this.drawingCanvas.getContext('2d')!;
  }

  getPosition(ev: MouseEvent | TouchEvent): [number, number] {
    const rect = this.interfaceCanvas.getBoundingClientRect();

    let x = (ev as MouseEvent).clientX;
    let y = (ev as MouseEvent).clientY;

    // use first touch if available
    const touches = (ev as TouchEvent).changedTouches;
    if (touches && touches.length > 0) {
      x = touches[0].clientX;
      y = touches[0].clientY;
    }

    return [x - rect.left, y - rect.top];
  }

  draw(x: number, y: number) {
    // draw cursor
    this.interfaceContext.clearRect(0, 0, this.w, this.h);
    this.interfaceContext.lineWidth = 1;
    this.interfaceContext.strokeStyle = 'gray';
    this.interfaceContext.beginPath();
    this.interfaceContext.arc(x, y, this.strokeWidth, 0, Math.PI * 2);
    this.interfaceContext.stroke();

    // current stroke
    this.currentStrokeContext.clearRect(0, 0, this.w, this.h);

    if (!this.currentStroke) return;
    this.drawStroke(this.currentStrokeContext, this.currentStroke);
  }
  redraw() {
    this.drawingContext.clearRect(0, 0, this.w, this.h);
    for (const stroke of this.strokes) {
      this.drawStroke(this.drawingContext, stroke);
    }
  }
  drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width * 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    let [x, y] = stroke.points[0];
    context.beginPath();
    context.moveTo(x, y);
    for (let i = 1; i < stroke.points.length; i++) {
      [x, y] = stroke.points[i];
      context.lineTo(x, y);
    }
    context.stroke();
  }
  commitStroke() {
    if (!this.currentStroke) return;
    this.strokes.push(this.currentStroke);
    this.currentStroke = null;
    this.drawingContext.drawImage(this.currentStrokeCanvas, 0, 0, this.w, this.h);
    this.currentStrokeContext.clearRect(0, 0, this.w, this.h);
  }

  clickColor = (ev: Event) => {
    const value = (ev.currentTarget as HTMLButtonElement).value;
    this.strokeColor = value;
  };
  undo = () => {
    if (!this.strokes.length) return;
    this.strokes.pop();
    this.redraw();
  }
  mousedown = (ev: MouseEvent | TouchEvent) => {
    ev.preventDefault();
    const [x, y] = this.getPosition(ev);
    this.currentStroke = {
      points: [[x, y]],
      color: this.strokeColor,
      width: this.strokeWidth,
    };
    this.draw(x, y);
  };
  mousemove = (ev: MouseEvent | TouchEvent) => {
    const [x, y] = this.getPosition(ev);
    if (this.currentStroke) {
      this.currentStroke.points.push([x, y]);
    }
    this.draw(x, y);
  };
  mouseup = (ev: MouseEvent | TouchEvent) => {
    if (this.currentStroke) {
      const [x, y] = this.getPosition(ev);
      this.currentStroke.points.push([x, y]);
      this.commitStroke();
      this.draw(x, y);
    }
  };
}
