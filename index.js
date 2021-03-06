"use strict";
let MatType = Array;
let obj = Object;
let input = Object;
let selected_id = Number;
let input_change = Boolean;

Object.size = function(obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

//Selected Button
function toggleClass(elem,className){
  if (elem.className.indexOf(className) !== -1){
    elem.className = elem.className.replace(className,'');
  }
  else{
    elem.className = elem.className.replace(/\s+/g,' ') + 	' ' + className;
  }

  return elem;
}

function toggleDisplay(elem){
  const curDisplayStyle = elem.style.display;			

  if (curDisplayStyle === 'none' || curDisplayStyle === ''){
    elem.style.display = 'block';
  }
  else{
    elem.style.display = 'none';
  }

}

function toggleMenuDisplay(e){
  const dropdown = e.currentTarget.parentNode;
  const menu = dropdown.querySelector('.menu');
  const icon = dropdown.querySelector('.fa-angle-right');

  toggleClass(menu,'hide');
  toggleClass(icon,'rotate-90');
}

function handleOptionSelected(e){
  toggleClass(e.target.parentNode, 'hide');			

  const id = e.target.id;
  const newValue = e.target.textContent + ' ';
  const titleElem = document.querySelector('.dropdown .title');
  const icon = document.querySelector('.dropdown .title .fa');


  titleElem.textContent = newValue;
  titleElem.appendChild(icon);

  //trigger custom event
  document.querySelector('.dropdown .title').dispatchEvent(new Event('change'));
    //setTimeout is used so transition is properly shown
  setTimeout(() => toggleClass(icon,'rotate-90',0));
}

function handleTitleChange(e){
  const result = document.getElementById('result');

  result.innerHTML = 'Selected Model : ' + e.target.textContent;
  selected_id = parseInt(e.target.textContent);
}


//load button
document.getElementById('load-button')
  .addEventListener('change', function() {
    
  var fr=new FileReader();
  fr.onload=function(){
      document.getElementById('output')
              .innerHTML=fr.result;
      input_change = true;
      // console.log(fr.result)
      // hollow_objects();
      main();
  }
  fr.readAsText(this.files[0]); 
});

function cross(a, b, dst) {
  dst = dst || new MatType(3);
  dst[0] = a[1] * b[2] - a[2] * b[1];
  dst[1] = a[2] * b[0] - a[0] * b[2];
  dst[2] = a[0] * b[1] - a[1] * b[0];
  return dst;
}

function radToDeg(r) {
  return r * 180 / Math.PI;
}
function degToRad(d) {
  return d * Math.PI / 180;
}

function main() {
  var isi = document.getElementById("output").innerHTML;
  if(typeof isi !== 'undefined' && isi !== null && isi!="") {
    input = JSON.parse(isi);
  }

  obj = input.models;
  selected_id = 0;
  console.log(Object.size(obj));

  var element = document.getElementsByClassName("menu pointerCursor hide");
  element[0].innerHTML = "";

  for(var index=0; index<Object.size(obj); index++){
    var div = document.createElement("div");
    div.className = "option";
    div.innerHTML = index;
    element[0].appendChild(div);
  }
  
  //get elements
  const dropdownTitle = document.querySelector('.dropdown .title');
  const dropdownOptions = document.querySelectorAll('.dropdown .option');
      
  //bind listeners to these elements
  dropdownTitle.addEventListener('click', toggleMenuDisplay);
      
  dropdownOptions.forEach(option => option.addEventListener('click',handleOptionSelected));
      
  document.querySelector('.dropdown .title').addEventListener('change',handleTitleChange);

  var fieldOfViewRadians, 
    cameraAngleRadians , 
    radiusnya, 
    camRadius, 
    viewing;

  function init(){
    obj = JSON.parse(isi).models;
    // gl.useProgram(program);
    fieldOfViewRadians = degToRad(90);
    cameraAngleRadians = [degToRad(0),degToRad(0),degToRad(0)];
    radiusnya = 0;
    camRadius = 600;
    viewing = 0; //0: Perspective, 1: Orto, 2: Oblique
    //untuk setiap model
    for(var index=0; index<Object.size(obj); index++){
      obj[index].buffer = new Float32Array(obj[index].buffer);
      obj[index].color = new Uint8Array(obj[index].color);
      obj[index].translation = new Float32Array(obj[index].translation);
      obj[index].scale  = [1,1,1];
      obj[index].rotation = [degToRad(0),degToRad(0),degToRad(0)];
      obj[index].iscolor = false;
    }
  }

  init();

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#content");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // setup GLSL program
  const defaultShaderType = [
      'VERTEX_SHADER',
      'FRAGMENT_SHADER',
  ];
  function createProgram(
      gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
    const errFn = opt_errorCallback;
    const program = gl.createProgram();
    shaders.forEach(function(shader) {
      gl.attachShader(program, shader);
    });
    if (opt_attribs) {
      opt_attribs.forEach(function(attrib, ndx) {
        gl.bindAttribLocation(
            program,
            opt_locations ? opt_locations[ndx] : ndx,
            attrib);
      });
    }
    gl.linkProgram(program);

    // Check the link status
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        // something went wrong with the link
        const lastError = gl.getProgramInfoLog(program);
        errFn('Error in program linking:' + lastError);

        gl.deleteProgram(program);
        return null;
    }
    return program;
  }
  function createProgramFromScripts(
        gl, shaderScriptIds, opt_attribs, opt_locations, opt_errorCallback) {
      const shaders = [];
      for (let ii = 0; ii < shaderScriptIds.length; ++ii) {
        shaders.push(createShaderFromScript(
            gl, shaderScriptIds[ii], gl[defaultShaderType[ii]], opt_errorCallback));
      }
      return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
  }
  function createShaderFromScript(
      gl, scriptId, opt_shaderType, opt_errorCallback) {
    let shaderSource = '';
    let shaderType;
    const shaderScript = document.getElementById(scriptId);
    if (!shaderScript) {
      throw ('*** Error: unknown script element' + scriptId);
    }
    shaderSource = shaderScript.text;

    if (!opt_shaderType) {
      if (shaderScript.type === 'x-shader/x-vertex') {
        shaderType = gl.VERTEX_SHADER;
      } else if (shaderScript.type === 'x-shader/x-fragment') {
        shaderType = gl.FRAGMENT_SHADER;
      } else if (shaderType !== gl.VERTEX_SHADER && shaderType !== gl.FRAGMENT_SHADER) {
        throw ('*** Error: unknown shader type');
      }
    }

    return loadShader(
        gl, shaderSource, opt_shaderType ? opt_shaderType : shaderType,
        opt_errorCallback);
  }
  function loadShader(gl, shaderSource, shaderType, opt_errorCallback) {
      const errFn = opt_errorCallback;
      // Create the shader object
      const shader = gl.createShader(shaderType);
  
      // Load the shader source
      gl.shaderSource(shader, shaderSource);
  
      // Compile the shader
      gl.compileShader(shader);
  
      // Check the compile status
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        // Something went wrong during compilation; get the error
        const lastError = gl.getShaderInfoLog(shader);
        errFn('*** Error compiling shader \'' + shader + '\':' + lastError + `\n` + shaderSource.split('\n').map((l,i) => `${i + 1}: ${l}`).join('\n'));
        gl.deleteShader(shader);
        return null;
      }
  
      return shader;
  }
  function computeMatrix(matrix, viewProjectionMatrix, translation, rotation, scale) {
    var angle = Math.PI * 2;
    var x = Math.cos(angle) * radiusnya;
    var y = Math.sin(angle) * radiusnya;
    matrix = m4.translate(viewProjectionMatrix, x, 0, y);
    matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
    matrix = m4.xRotate(matrix, rotation[0]);
    matrix = m4.yRotate(matrix, rotation[1]);
    matrix = m4.zRotate(matrix, rotation[2]);
    switch(viewing){
      case 0:
        matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);
        break;
      default :
        matrix = m4.scale(matrix, -scale[0], -scale[1], -scale[2]);
        break;
    };
    return matrix;
  }

  drawScene();

  // Setup a ui.
  var fieldOfViewSlider = document.getElementById("fieldOfView-range");
  var xSlider = document.getElementById("x-pos-range");
  var ySlider = document.getElementById("y-pos-range");
  var zSlider = document.getElementById("z-pos-range");
  var scaleX = document.getElementById("scaleX");
  var scaleY = document.getElementById("scaleY");
  var scaleZ = document.getElementById("scaleZ");
  var angleX = document.getElementById("angleX");
  var angleY = document.getElementById("angleY");
  var angleZ = document.getElementById("angleZ");
  var cameraAngleX = document.getElementById("cameraAngleX");
  var cameraAngleY = document.getElementById("cameraAngleY");
  var cameraAngleZ = document.getElementById("cameraAngleZ");
  var cameraRadius = document.getElementById("cameraRadius");
  var shadernya = document.getElementById("shadernya");
  var reset = document.getElementById("reset-button");
  var pers = document.getElementById("perspective-button");
  var ortho = document.getElementById("ortho-button");
  var oblique = document.getElementById("oblique-button");
  
  //Inisialisasi
  fieldOfViewSlider.value = fieldOfViewRadians;
  reset.onclick = function(){
    init();
    drawScene()
  }
  pers.onclick = function(){
    viewing = 0;
    drawScene()
  }
  ortho.onclick = function(){
    viewing = 1;
    drawScene()
  }
  oblique.onclick = function(){
    viewing = 2;
    drawScene()
  }
  shadernya.oninput = function(){
    updateColor(this);
  }
  fieldOfViewSlider.oninput = function() {
      updateFieldOfView(this);
  }
  xSlider.oninput = function() {
      updatePosition(0, this);
  }
  ySlider.oninput = function() {
      updatePosition(1, this);
  }
  zSlider.oninput = function() {
      updatePosition(2, this);
  }
  //Scale
  scaleX.oninput = function() {
      updateScale(0, this);
  }
  scaleY.oninput = function() {
      updateScale(1, this);
  }
  scaleZ.oninput = function() {
      updateScale(2, this);
  }
  //Rotation
  angleX.oninput = function() {
      updateRotation(0, this);
  }
  angleY.oninput = function() {
      updateRotation(1, this);
  }
  angleZ.oninput = function() {
      updateRotation(2, this);
  }
  //camera Angle
  cameraAngleX.oninput = function() {
      updateCameraAngle(0, this);
  }
  cameraAngleY.oninput = function() {
      updateCameraAngle(1, this);
  }
  cameraAngleZ.oninput = function() {
      updateCameraAngle(2, this);
  }
  //camera radian
  cameraRadius.oninput = function() {
      updateCameraRadius(this);
  }
  function reset(){
    drawScene();
  }
  function updateColor(ui) {
    obj[selected_id].iscolor = ui.checked;
    drawScene();
  }
  function updateCameraAngle(index,ui) {
    cameraAngleRadians[index] = degToRad(ui.value);
    drawScene();
  }
  function updateCameraRadius(ui) {
    camRadius = ui.value;
    drawScene();
  }
  function updateFieldOfView(ui) {
    fieldOfViewRadians = degToRad(ui.value);
    drawScene();
  }
  function updatePosition(index, ui) {
    obj[selected_id].translation[index] = ui.value;
    drawScene();
  }
  function updateRotation(index,ui) {
      var angleInDegrees = (parseInt(ui.value));
      var angleInRadians = angleInDegrees * Math.PI / 180;
      obj[selected_id].rotation[index] = angleInRadians;
      drawScene();
  }
  function updateScale(index,ui) {
    obj[selected_id].scale[index] = ui.value;
    drawScene();
  }
  function resizeCanvasToDisplaySize(canvas, multiplier) {
    multiplier = multiplier || 1;
    const width  = canvas.clientWidth  * multiplier | 0;
    const height = canvas.clientHeight * multiplier | 0;
    if (canvas.width !== width ||  canvas.height !== height) {
      canvas.width  = width;
      canvas.height = height;
      return true;
    }
    return false;
  }
  // Draw the scene.
  function drawScene() {
    if(input_change){
      // Clear the canvas AND the depth buffer.
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      input_change = false;
    }
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 2000;
    var right = gl.canvas.clientWidth;
    var bottom = gl.canvas.clientHeight;
    //tentukan default di sini
    var top = -bottom;
    var left = aspect*top;
    switch(viewing){
      case 0:
        var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
        break;
      case 1:
        var projectionMatrix = m4.orthographic(left, right, bottom, top, zNear, zFar);
        break;
      case 2:
        var oblique = m4.oblique(-45, -45);
        var projectionMatrix = m4.multiply(oblique, m4.orthographic(left, right, bottom, top, zNear, zFar));
        break;
    };
    var cameraMatrix = m4.xRotation(cameraAngleRadians[0]);
    cameraMatrix = m4.yRotate(cameraMatrix, cameraAngleRadians[1]);
    cameraMatrix = m4.zRotate(cameraMatrix, cameraAngleRadians[2]);
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, radiusnya + camRadius);
    // Make a view matrix from the camera matrix
    var viewMatrix = m4.inverse(cameraMatrix);
    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    for(var index=0; index<Object.size(obj); index++){
      var program = createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);
      // look up where the vertex data needs to go.
      var positionLocation = gl.getAttribLocation(program, "a_position");
      var colorLocation = gl.getAttribLocation(program, "a_color");
      // lookup uniforms
      var matrixLocation = gl.getUniformLocation(program, "u_matrix");
      // Create a buffer to put positions in
      var positionBuffer = gl.createBuffer();
      // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      // Create a buffer to put colors in
      var colorBuffer = gl.createBuffer();
      // Put geometry data into buffer
      resizeCanvasToDisplaySize(gl.canvas, 1);
      // Tell WebGL how to convert from clip space to pixels
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      // Turn on culling. By default backfacing triangles
      // will be culled.
      gl.enable(gl.CULL_FACE);
      // Enable the depth buffer
      gl.enable(gl.DEPTH_TEST);
      // Tell it to use our program (pair of shaders)
      gl.useProgram(program);
      // Turn on the position attribute
      gl.enableVertexAttribArray(positionLocation);
      // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
      var size = 3;          // 3 components per iteration
      var type = gl.FLOAT;   // the data is 32bit floats
      var normalize = false; // don't normalize the data
      var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;        // start at the beginning of the buffer
      gl.vertexAttribPointer(
          positionLocation, size, type, normalize, stride, offset);
      // Put geometry data into buffer
      setGeometry(gl, obj[index].buffer);
      // Turn on the color attribute
      gl.enableVertexAttribArray(colorLocation);
      // Bind the color buffer.
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
      var size = 3;                 // 3 components per iteration
      var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
      var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
      var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;               // start at the beginning of the buffer
      gl.vertexAttribPointer(
          colorLocation, size, type, normalize, stride, offset);
      // Set the matrix.
      // Compute the matrices for each object.
      // ------ Draw the objects --------
      switch(viewing){
        case 0:
          var matrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
          break;
        case 1:
          var matrix = m4.orthographic(left, right, bottom, top, zNear, zFar);
          break;
        case 2:
          var oblique = m4.oblique(-45, -45);
          var matrix = m4.multiply(oblique, m4.orthographic(left, right, bottom, top, zNear, zFar));
          break;
      };

      // // Setup all the needed attributes.
      if(obj[index].iscolor){
        setColors(gl, obj[index].color);
      }else{
        setColorsWhite(gl);
      }
      var uniforms = computeMatrix(
        matrix,
        viewProjectionMatrix,
        obj[index].translation,
        obj[index].rotation,
        obj[index].scale);
      
      // Set the uniforms we just computed
      // twgl.setUniforms(programInfo, object.uniforms);
      gl.uniformMatrix4fv(matrixLocation, false, uniforms);
      
      // Draw the geometry.
      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      //jumlah sisi yang digambar
      var count = 128 * 6;
      gl.drawArrays(primitiveType, offset, count);
    }
  }
}

var m4 = {

  perspective: function(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ];
  },

  orthographic: function(left, right, bottom, top, near, far) {
    return [
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, 2 / (near - far), 0,
      (left + right) / (left - right), (bottom + top) / (bottom - top), (near + far) / (near - far), 1
    ];
  },

  oblique: function(theta, phi){
    var t = degToRad(theta);
    var p = degToRad(phi);
    var cotT = -1/Math.tan(t);
    var cotP = -1/Math.tan(p);
    return [
      1, 0, 0, 0, 
      0, 1, 0, 0, 
      cotT, cotP, 1, 0,  
      0, 0, 0, 1
    ];
  },

  lookAt: function(cameraPosition, target, up, dst) {
    dst = dst || new MatType(16);
    var zAxis = m4.normalize(
        this.subtractVectors(cameraPosition, target));
    var xAxis = m4.normalize(cross(up, zAxis));
    var yAxis = m4.normalize(cross(zAxis, xAxis));

    dst[ 0] = xAxis[0];
    dst[ 1] = xAxis[1];
    dst[ 2] = xAxis[2];
    dst[ 3] = 0;
    dst[ 4] = yAxis[0];
    dst[ 5] = yAxis[1];
    dst[ 6] = yAxis[2];
    dst[ 7] = 0;
    dst[ 8] = zAxis[0];
    dst[ 9] = zAxis[1];
    dst[10] = zAxis[2];
    dst[11] = 0;
    dst[12] = cameraPosition[0];
    dst[13] = cameraPosition[1];
    dst[14] = cameraPosition[2];
    dst[15] = 1;

    return dst;
  },

  normalize: function(v, dst) {
    dst = dst || new MatType(3);
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      dst[0] = v[0] / length;
      dst[1] = v[1] / length;
      dst[2] = v[2] / length;
    }
    return dst;
  },

  projection: function(width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 2 / depth, 0,
      -1, 1, 0, 1,
    ];
  },

  subtractVectors:function(a, b, dst) {
    dst = dst || new MatType(3);
    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    dst[2] = a[2] - b[2];
    return dst;
  },

  scaleVector:function(v, s, dst) {
    dst = dst || new MatType(3);
    dst[0] = v[0] * s;
    dst[1] = v[1] * s;
    dst[2] = v[2] * s;
    return dst;
  },

  addVectors:function(a, b, dst) {
    dst = dst || new MatType(3);
    dst[0] = a[0] + b[0];
    dst[1] = a[1] + b[1];
    dst[2] = a[2] + b[2];
    return dst;
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);

    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

  inverse: function(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
            (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
            (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
            (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
            (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
            (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
            (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
            (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
            (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
            (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
            (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
            (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
            (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
    ];
  },

  vectorMultiply: function(v, m) {
    var dst = [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
  },

  length:function(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }
};

// // Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl, array_buffer) {
  gl.bufferData(
      gl.ARRAY_BUFFER, 
      array_buffer,
      gl.STATIC_DRAW);
}

// Fill the buffer with colors for the model.
function setColors(gl, warna) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      warna,
      gl.STATIC_DRAW);
}

function setColorsWhite(gl) {
  var warna = new Uint8Array(2304).fill(160);
  gl.bufferData(
      gl.ARRAY_BUFFER,
      warna,
      gl.STATIC_DRAW);
}

main();