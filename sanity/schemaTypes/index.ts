import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide } from './slides'
import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'

export const schemaTypes = [
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide,
  about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
]
