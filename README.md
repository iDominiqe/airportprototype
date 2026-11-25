# RMO SkyHub — Chișinău International Airport (RMO · LUKK) 3D Simulation

Interactive 3D airline booking & dual-runway airport simulation built with React 18, TypeScript, Three.js, React Three Fiber, `@react-three/postprocessing` (Bloom), and Tailwind CSS.

## Live Demo
- Subdomain: https://airportprototype.idominiqe.com

## Key Features
- **3D Airport Diorama (`RMO / LUKK`)**: Curved glass concourse terminal, illuminated boarding gates (`G1`–`G6`) with telescopic jet bridges, rotating ATC tower radar, taxiways with instanced blue/green lighting, and dual parallel runways (`08L/26R` arrivals & `08R/26L` departures) with PAPI indicators and sequenced approach lights.
- **Continuous Dual-Runway Air Traffic**: Distinct commercial airliner silhouettes (Boeing 787-9, Boeing 737-800, Airbus A320neo, Airbus A350-900) performing glideslope landings with tire smoke particles & reverse thrust on `08L`, and takeoffs with gear retraction on `08R`.
- **Interactive Route Map & Flight Calculator**: Real-world great-circle distance (km), estimated duration, assigned aircraft, and dynamic fare calculation from Chișinău (`RMO`) to `OTP`, `IST`, `FRA`, `CDG`, `LTN`, `DXB`, and `NRT` on a 3D interactive globe.
- **Interactive Cabin Seat Map & Checkout**: Business Class, Extra Legroom, and Economy A–F seat selection updating total fare and live QR boarding pass preview in real time.
- **Cinematic Post-Purchase Takeoff**: Confirming simulated payment triggers full gate pushback, taxi to `08R`, engine spool-up, `V2` rotation, gear retraction, and cloud climbout tracking shot.
- **Camera Presets & Environment Lighting**: `Dual Runways`, `Control Tower View`, `Departure Runway Close-up`, `Global Route Map`, plus `Day` / `Sunset` / `Night` modes.
