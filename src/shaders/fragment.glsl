

varying vec2 vUv;
// uniform sampler for texture video
uniform sampler2D video;

void main()
{
    gl_FragColor = texture2D(video, vUv);
}
