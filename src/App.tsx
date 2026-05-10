import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './screens/Home';
import Import from './screens/Import';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/import" element={<Import />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
