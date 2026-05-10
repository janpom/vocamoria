import { Navigate, Route, Routes } from 'react-router-dom';
import Matching from './games/Matching';
import Quiz from './games/Quiz';
import Typing from './games/Typing';
import Home from './screens/Home';
import Import from './screens/Import';
import Settings from './screens/Settings';
import WordList from './screens/WordList';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/import" element={<Import />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/matching" element={<Matching />} />
      <Route path="/typing" element={<Typing />} />
      <Route path="/words" element={<WordList />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
