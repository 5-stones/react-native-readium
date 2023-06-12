import type { Link } from './Link';
import type { Locator } from './Locator';

export type File = {
  /**
   * A string path to an eBook on disk.
   */
  url: string;

  /**
   * An optional location that the eBook will be opened at.
   */
  initialLocation?: Locator | Link;
};
