import { io } from 'socket.io-client';

const socket = io('/', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('🌊 Connected to AquaSentinel realtime');
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from AquaSentinel');
});

export default socket;
