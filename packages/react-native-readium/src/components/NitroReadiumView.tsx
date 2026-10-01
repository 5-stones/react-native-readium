import { getHostComponent } from 'react-native-nitro-modules';
import type { ReadiumViewProps, ReadiumViewMethods } from '../specs/ReadiumView.nitro';
import ReadiumViewConfig from '../../nitrogen/generated/shared/json/ReadiumViewConfig.json';

export const NitroReadiumView =
  getHostComponent<ReadiumViewProps, ReadiumViewMethods>(
    'ReadiumView',
    () => ReadiumViewConfig
  );
