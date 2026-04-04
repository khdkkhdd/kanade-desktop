import { render } from 'solid-js/web';

function App() {
  return (
    <div>
      <h1>Kanade (奏)</h1>
      <p>YouTube desktop client with song relation data.</p>
    </div>
  );
}

render(() => <App />, document.getElementById('root')!);
