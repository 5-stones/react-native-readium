// Generate required css
import faIconFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
import miIconFont from 'react-native-vector-icons/Fonts/MaterialIcons.ttf';

export default () => {
  const faIconFontStyles = `
    @font-face {
      src: url(${faIconFont});
      font-family: FontAwesome;
    }
    @font-face {
      src: url(${miIconFont});
      font-family: MaterialIcons;
    }
  `;

  // Create stylesheet
  const style = document.createElement('style');
  style.type = 'text/css';

  // @ts-expect-error Property 'styleSheet' does not exist
  if (style.styleSheet) {
    // @ts-expect-error Property 'styleSheet' does not exist
    style.styleSheet.cssText = faIconFontStyles;
  } else {
    style.appendChild(document.createTextNode(faIconFontStyles));
  }

  // Inject stylesheet
  document.head.appendChild(style);
};
