import { mapEpubPreferences } from '../mapEpubPreferences';

/**
 * Our preference vocabulary, as the web navigator wants it.
 *
 * Everything not named here is passed through, which is why the two that need
 * translating are worth pinning: a value the navigator's guards do not
 * recognise is discarded in silence, so the preference simply never applies.
 */
describe('mapEpubPreferences', () => {
  it('sends column counts as numbers', () => {
    expect(mapEpubPreferences({ columnCount: 'one' })).toMatchObject({
      columnCount: 1,
    });
    expect(mapEpubPreferences({ columnCount: 'two' })).toMatchObject({
      columnCount: 2,
    });
  });

  /** The deprecated numerals keep working, so no consumer has to be rewritten. */
  it('still sends the deprecated numerals', () => {
    expect(mapEpubPreferences({ columnCount: '1' })).toMatchObject({
      columnCount: 1,
    });
    expect(mapEpubPreferences({ columnCount: '2' })).toMatchObject({
      columnCount: 2,
    });
  });

  /** The navigator spells "no particular count" as the absence of one. */
  it('sends auto as no count at all', () => {
    expect(mapEpubPreferences({ columnCount: 'auto' })).toMatchObject({
      columnCount: null,
    });
  });

  it('leaves the count alone when nothing asked for one', () => {
    expect(mapEpubPreferences({ fontSize: 1.2 })).not.toHaveProperty(
      'columnCount'
    );
  });

  it('keeps the text alignments Readium CSS knows', () => {
    for (const textAlign of ['start', 'left', 'right', 'justify']) {
      expect(mapEpubPreferences({ textAlign })).toMatchObject({ textAlign });
    }
  });

  /** `center` and `end` are native-only; the navigator has no value for them. */
  it('drops the text alignments it does not', () => {
    expect(mapEpubPreferences({ textAlign: 'center' })).not.toHaveProperty(
      'textAlign'
    );
    expect(mapEpubPreferences({ textAlign: 'end' })).not.toHaveProperty(
      'textAlign'
    );
  });

  it('scales page margins into the gutter the navigator uses', () => {
    const mapped = mapEpubPreferences({ pageMargins: 2 });

    expect(mapped).toMatchObject({ pageGutter: 40 });
    expect(mapped).not.toHaveProperty('pageMargins');
  });

  it('turns a theme into the colours it stands for', () => {
    expect(mapEpubPreferences({ theme: 'dark' })).toMatchObject({
      backgroundColor: '#000000',
      textColor: '#ffffff',
    });
  });

  it('leaves explicit colours alone', () => {
    expect(
      mapEpubPreferences({ theme: 'dark', textColor: '#abcdef' })
    ).toMatchObject({ textColor: '#abcdef' });
  });
});
