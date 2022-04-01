import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// https://github.com/oblador/react-native-vector-icons/issues/328#issuecomment-860038108
import FAIcon from 'react-native-vector-icons/FontAwesome';
FAIcon.loadFont();
import IOIcon from 'react-native-vector-icons/Ionicons';
IOIcon.loadFont();

AppRegistry.registerComponent(appName, () => App);
