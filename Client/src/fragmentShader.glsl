// Fragment Shader
varying vec3 vPosition;

uniform float time;
uniform vec2 resolution;

void main() {
    // Calculate distance to the edge
    float edgeWidth = 0.1; // Adjust for thicker/thinner border
    float glowIntensity = 0.5; // Adjust for stronger/weaker glow
    float distanceFromEdge = min(min(vPosition.x, 1.0 - vPosition.x), min(vPosition.y, 1.0 - vPosition.y));
    float glow = smoothstep(edgeWidth, edgeWidth - glowIntensity, distanceFromEdge);
    
    // Apply glow effect
    vec3 glowColor = vec3(1.0, 0.5, 0.0); // Orange glow, adjust as needed
    vec3 color = mix(vec3(0.0), glowColor, glow);
    
    gl_FragColor = vec4(color, 1.0);
}