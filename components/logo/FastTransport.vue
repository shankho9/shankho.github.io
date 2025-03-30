<template>
  <div class="relative w-full h-[600px] overflow-hidden bg-transparent">
    <svg class="w-full h-full" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
      <!-- Sky -->
      <rect width="1200" height="600" fill="#87CEEB" />

      <!-- Sun -->
      <circle cx="1000" cy="80" r="50" fill="yellow" class="animate-sun" />

      <!-- Moving Clouds -->
      <g class="animate-clouds">
        <ellipse cx="100" cy="80" rx="50" ry="25" fill="white" opacity="0.8" />
        <ellipse cx="600" cy="100" rx="60" ry="30" fill="white" opacity="0.8" />
        <ellipse cx="1100" cy="90" rx="55" ry="28" fill="white" opacity="0.8" />
      </g>

      <!-- Airplane -->
      <g class="animate-plane">
        <path
          d="M200,120 L270,100 L290,105 L270,110 L200,90 Z"
          fill="gray"
          stroke="black"
          stroke-width="2"
        />
        <circle cx="250" cy="100" r="5" fill="black" />
      </g>

      <!-- Mountains -->
      <polygon points="100,350 350,100 600,350" fill="#6B8E23" />
      <polygon points="500,370 800,120 1100,370" fill="#556B2F" />

      <!-- Road -->
      <path d="M0,500 Q300,450 600,500 T1200,500" fill="gray" />

      <!-- Buildings -->
      <g fill="#B0C4DE">
        <rect x="50" y="280" width="100" height="220" stroke="black" stroke-width="2" />
        <rect x="180" y="320" width="90" height="180" stroke="black" stroke-width="2" />
        <rect x="310" y="290" width="110" height="210" stroke="black" stroke-width="2" />
        <!-- Windows -->
        <g fill="white">
          <rect x="60" y="300" width="20" height="20" />
          <rect x="60" y="340" width="20" height="20" />
          <rect x="90" y="300" width="20" height="20" />
          <rect x="90" y="340" width="20" height="20" />
          <rect x="190" y="340" width="15" height="15" />
          <rect x="190" y="370" width="15" height="15" />
          <rect x="320" y="310" width="20" height="20" />
          <rect x="350" y="310" width="20" height="20" />
        </g>
      </g>

      <!-- Monuments -->
      <g fill="#8B4513">
        <!-- Eiffel Tower -->
        <polygon points="850,350 900,150 950,350" stroke="black" stroke-width="2" />
        <line x1="870" y1="250" x2="930" y2="250" stroke="black" stroke-width="2" />
        <line x1="880" y1="200" x2="920" y2="200" stroke="black" stroke-width="2" />

        <!-- Clock Tower -->
        <rect x="1050" y="250" width="60" height="200" stroke="black" stroke-width="2" />
        <circle cx="1080" cy="280" r="20" fill="white" stroke="black" />
        <line x1="1080" y1="280" x2="1090" y2="270" stroke="black" stroke-width="2" />
        <line x1="1080" y1="280" x2="1070" y2="290" stroke="black" stroke-width="2" />
      </g>

      <!-- Trees -->
      <g class="animate-parallax">
        <rect x="150" y="400" width="20" height="60" fill="brown" />
        <circle cx="160" cy="380" r="40" fill="green" />
        <rect x="950" y="410" width="20" height="70" fill="brown" />
        <circle cx="960" cy="390" r="45" fill="darkgreen" />
      </g>

      <!-- Moving Cars -->
      <g class="animate-car">
        <rect x="700" y="450" width="100" height="50" fill="red" />
        <circle cx="720" cy="500" r="12" fill="black" />
        <circle cx="780" cy="500" r="12" fill="black" />
      </g>
      <g class="animate-car">
        <rect x="200" y="460" width="80" height="45" fill="blue" />
        <circle cx="220" cy="505" r="10" fill="black" />
        <circle cx="260" cy="505" r="10" fill="black" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Sun Rising and Setting */
@keyframes moveSun {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(20px);
  }
}
.animate-sun {
  animation: moveSun 10s ease-in-out infinite;
}

/* Moving Clouds */
@keyframes moveClouds {
  0% {
    transform: translateX(-100px);
  }
  100% {
    transform: translateX(1300px);
  }
}
.animate-clouds {
  animation: moveClouds 25s linear infinite;
}

/* Moving Airplane */
@keyframes movePlane {
  0% {
    transform: translateX(-200px);
  }
  100% {
    transform: translateX(1400px);
  }
}
.animate-plane {
  animation: movePlane 15s linear infinite;
}

/* Moving Cars */
@keyframes moveCar {
  0% {
    transform: translateX(-200px);
  }
  100% {
    transform: translateX(1400px);
  }
}
.animate-car {
  animation: moveCar 8s linear infinite;
}

/* Parallax Trees */
@keyframes moveParallax {
  0% {
    transform: translateX(-50px);
  }
  100% {
    transform: translateX(50px);
  }
}
.animate-parallax {
  animation: moveParallax 10s ease-in-out infinite alternate;
}
</style>
