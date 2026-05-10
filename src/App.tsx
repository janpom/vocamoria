import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './screens/Home';
import Import from './screens/Import';
import Practice from './screens/Practice';
import Settings from './screens/Settings';
import WordList from './screens/WordList';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/import" element={<Import />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/words" element={<WordList />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
