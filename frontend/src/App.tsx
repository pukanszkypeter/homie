import { DeviceCard } from "./components/DeviceCard";
import { useDevices } from "./hooks/useDevices";
import "./App.css";

export default function App() {
  const { devices, error, updateDevice } = useDevices();

  const rooms = Array.from(new Set(devices.map((d) => d.room)));

  return (
    <div className="app">
      <header className="app__header">
        <h1>Home</h1>
        {error && <span className="app__error">{error}</span>}
      </header>
      {rooms.map((room) => (
        <section key={room} className="room">
          <h2 className="room__title">{room}</h2>
          <div className="room__grid">
            {devices
              .filter((d) => d.room === room)
              .map((device) => (
                <DeviceCard key={device.id} device={device} onUpdate={updateDevice} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
