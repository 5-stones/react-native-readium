import { Appearance, Settings } from 'react-native-readium';

const defaultSettings = new Settings();
defaultSettings.appearance = Appearance.NIGHT;
export { defaultSettings as DEFAULT_SETTINGS };
