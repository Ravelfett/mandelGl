main();

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }
  let width = window.innerWidth;
  let height = window.innerHeight;

  function resize() {
    width = window.innerWidth,
    height = window.innerHeight,
    ratio = window.devicePixelRatio;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  window.onresize = function() {
    resize();
  };
  window.onload = function() {
    resize();
  };

  document.addEventListener('contextmenu', event => event.preventDefault());

  document.addEventListener('mousemove', (p) => {
    mouse[0] = (p.pageX);
    mouse[1] = (p.pageY);
  }, false);

  document.onmousedown = function (e) {
    if (e.button == 0) {
      pressed = true;
      d = [mouse[0], mouse[1]];
    }
    if (e.button == 2) {
      d = [mouse[0], mouse[1]];
      dragging = true;
    }
  };

  document.onmouseup = function (e) {
    if (e.button == 0) {
      pressed = false;
    }
    if (e.button == 2) {
      dragging = false;
    }
  };


  document.addEventListener("wheel", (e) => {
    if (e.deltaY < 0) {
      zoom *= 1.1;
    }else {
      zoom /= 1.1;
    }
  });


  const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 position;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      position = gl_Position;
    }
  `;

  const fsSource = `
    #define P 60

    precision highp float;
    varying lowp vec4 position;

    uniform vec2 uResolution;
    uniform vec2 uPosition;
    uniform vec2 uCamera;
    uniform float uZoom;


    vec3 hslToRgb( in vec3 c )
    {
      vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
      return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
    }

    void main(void) {
      vec2 point = (position.xy*uResolution.xy)/uZoom-uCamera;
      //vec2 c = vec2(point.x, point.y);
      vec2 c = vec2(uPosition.x, -uPosition.y);
      int ct = 0;

      for(int i = 0; i < P ; i++){
        if(length(point) < 5.){
          ct += 1;
          point = vec2(pow(point.x,2.)-pow(point.y,2.)+c.x,2.0*point.x*point.y+c.y);
        }
      }
      vec3 hslColor = vec3(267./360., 1, ((float(ct)/float(P))));
      gl_FragColor = vec4(hslToRgb(hslColor),1.);
    }
  `;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      resolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
      position: gl.getUniformLocation(shaderProgram, 'uPosition'),
      camera: gl.getUniformLocation(shaderProgram, 'uCamera'),
      zoom: gl.getUniformLocation(shaderProgram, 'uZoom'),
    },
  };
  const buffers = initBuffers(gl);

  let pos = [0, 0];
  let cam = [0, 0];
  let mouse = [0, 0];
  let pressed = false;
  let dragging = false;
  let d = [0, 0];
  let zoom = 500;

  function render() {
    if (pressed) {
      pos = [pos[0]-(d[0]-mouse[0])/zoom, pos[1]-(d[1]-mouse[1])/zoom]
      d = [mouse[0], mouse[1]];
    }

    if (dragging) {
      cam = [cam[0]-(d[0]-mouse[0])/zoom, cam[1]-(d[1]-mouse[1])/zoom]
      d = [mouse[0], mouse[1]];
    }


    drawScene(gl, programInfo, buffers, [(pos[0]), (pos[1])], [(cam[0]), -(cam[1])], zoom, width, height);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
function initBuffers(gl) {
  const positions = [
     1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
    -1.0, -1.0,
  ];
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  return {
    position: positionBuffer,
  };
}

function drawScene(gl, programInfo, buffers, pos, camera, zoom, width, height) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const zNear = 0.1;
  const zFar = 2;
  const projectionMatrix = mat4.create();
  mat4.ortho(projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);

  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix,
                 modelViewMatrix,
                 [-0.0, 0.0, -1.0]);
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  gl.useProgram(programInfo.program);

  gl.uniform2fv(
      programInfo.uniformLocations.resolution,
      new Float32Array([width, height]));
  gl.uniform2fv(
      programInfo.uniformLocations.position,
      new Float32Array(pos));
  gl.uniform2fv(
      programInfo.uniformLocations.camera,
      new Float32Array(camera));
  gl.uniform1f(
      programInfo.uniformLocations.zoom,
      zoom);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);
  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
