// Generate required css
// @ts-ignore
import faIconFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
// @ts-ignore
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
  // @ts-ignore
  if (style.styleSheet) {
    // @ts-ignore
    style.styleSheet.cssText = faIconFontStyles;
  } else {
    style.appendChild(document.createTextNode(faIconFontStyles));
  }

  // Inject stylesheet
  document.head.appendChild(style);
};
