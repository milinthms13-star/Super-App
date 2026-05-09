# TODO - RideSharing Super App (Full Stack)

## Phase 1: Functional end-to-end (route alignment + UI wiring)
- [ ] Inspect backend ridesharing routes and rideSharingStore
- [ ] Inspect frontend rideSharingService + RideSharing UI (booking, accept, location, complete)
- [ ] Backend: add/align endpoints to match frontend service contract:
  - [ ] POST   /api/ridesharing/rides
  - [ ] POST   /api/ridesharing/rides/:rideId/accept
  - [ ] POST   /api/ridesharing/location
  - [ ] GET    /api/ridesharing/my-rides
  - [ ] POST   /api/ridesharing/rides/:rideId/complete
- [ ] Backend: implement minimal status transitions in RideRequest model updates
- [ ] Frontend: rewire RideSharing.js to call backend endpoints instead of mock/simulated flows
  - [ ] booking confirm -> bookRide
  - [ ] driver accept/reject -> acceptRide (+ reject if added)
  - [ ] driver map location -> updateLocation works with backend
  - [ ] completion flow -> completeRide
- [ ] Add any missing reject/status endpoints needed by UI

## Phase 2: Live tracking + websockets
- [ ] Backend: emit ride progress events via Socket.IO room per rideId
- [ ] Frontend: subscribe to ride progress for active ride

## Phase 3: Safety extensions (reusing SOS patterns)
- [ ] Ride PIN verification fields
- [ ] In-ride SOS that creates ride safety incident + tracking link
- [ ] Trusted contacts + live sharing

