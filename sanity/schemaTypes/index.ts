import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide } from './slides'
import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'
import contact from './contact'
import essay from './essay'

export const schemaTypes = [
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide,
  about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
  contact,
  essay,
]
