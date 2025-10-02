uniform float pointMultiplier;

attribute vec2 textureOffset;
attribute vec2 textureRepeat;
attribute float pointSize;

varying vec2  _textureOffset;
varying vec2  _textureRepeat;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = pointSize * pointMultiplier / gl_Position.w;

  _textureOffset = textureOffset;
  _textureRepeat = textureRepeat;
}