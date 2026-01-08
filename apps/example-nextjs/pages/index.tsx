import dynamic from 'next/dynamic';

const ReaderApp = dynamic(() => import('../components/ReaderApp'), {
  ssr: false,
});

export default function App() {
  return <ReaderApp />;
}
