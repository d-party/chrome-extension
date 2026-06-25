/**
 * Curated set of user avatar icons (react-icons / Font Awesome 6).
 *
 * The chosen icon is stored as a react-icons key string (e.g. `"FaCat"`) and
 * sent to the backend on join, mirroring `user_name`. Both the popup picker and
 * the sidebar (user list / history) resolve the key through this single shared
 * map, so the content-script bundle only ever pulls in this curated subset
 * rather than the entire `react-icons/fa6` package.
 *
 * Keep keys in lock-step with the backend default: an unknown or missing key
 * falls back to {@link DEFAULT_USER_ICON} (the plain user outline), which is the
 * same default the backend assigns to clients that don't send `user_icon`.
 */

import type { IconType } from "react-icons/lib";
import {
  FaAnchor,
  FaAppleWhole,
  FaBasketball,
  FaBicycle,
  FaBolt,
  FaBug,
  FaCamera,
  FaCar,
  FaCarrot,
  FaCat,
  FaCheese,
  FaChess,
  FaCloud,
  FaCookie,
  FaCrow,
  FaCrown,
  FaDice,
  FaDog,
  FaDove,
  FaDragon,
  FaFeather,
  FaFilm,
  FaFire,
  FaFish,
  FaFrog,
  FaFutbol,
  FaGamepad,
  FaGem,
  FaGhost,
  FaGuitar,
  FaHeadphones,
  FaHeart,
  FaHippo,
  FaHorse,
  FaIceCream,
  FaKiwiBird,
  FaLeaf,
  FaMoon,
  FaMugHot,
  FaMusic,
  FaOtter,
  FaPalette,
  FaPaw,
  FaPizzaSlice,
  FaPlane,
  FaRegFaceAngry,
  FaRegFaceGrinHearts,
  FaRegFaceGrinStars,
  FaRegFaceLaugh,
  FaRegFaceMeh,
  FaRegFaceSadTear,
  FaRegFaceSmile,
  FaRegFaceSurprise,
  FaRegUser,
  FaRobot,
  FaRocket,
  FaSeedling,
  FaSkull,
  FaSnowflake,
  FaSpider,
  FaStar,
  FaSun,
  FaTree,
  FaUmbrella,
  FaUser,
  FaUserAstronaut,
  FaUserDoctor,
  FaUserGraduate,
  FaUserNinja,
  FaUserSecret,
  FaUserTie,
  FaWorm,
} from "react-icons/fa6";

/** Default key, kept identical to the backend's default for older clients/data. */
export const DEFAULT_USER_ICON = "FaRegUser";

/**
 * The curated, selectable icons keyed by their react-icons name. The first
 * entry is the default; the order here is the order shown in the picker.
 */
export const USER_ICONS: Record<string, IconType> = {
  // People
  FaRegUser,
  FaUser,
  FaUserAstronaut,
  FaUserNinja,
  FaUserSecret,
  FaUserTie,
  FaUserGraduate,
  FaUserDoctor,
  FaRobot,
  FaSkull,
  // Faces
  FaRegFaceSmile,
  FaRegFaceLaugh,
  FaRegFaceGrinStars,
  FaRegFaceGrinHearts,
  FaRegFaceSurprise,
  FaRegFaceMeh,
  FaRegFaceSadTear,
  FaRegFaceAngry,
  // Animals
  FaCat,
  FaDog,
  FaHorse,
  FaHippo,
  FaOtter,
  FaFrog,
  FaFish,
  FaCrow,
  FaDove,
  FaKiwiBird,
  FaSpider,
  FaWorm,
  FaBug,
  FaDragon,
  FaPaw,
  FaFeather,
  // Nature & weather
  FaTree,
  FaLeaf,
  FaSeedling,
  FaFire,
  FaBolt,
  FaSnowflake,
  FaSun,
  FaMoon,
  FaCloud,
  FaUmbrella,
  // Symbols
  FaCrown,
  FaGhost,
  FaHeart,
  FaStar,
  FaGem,
  // Activities & hobbies
  FaRocket,
  FaGamepad,
  FaDice,
  FaChess,
  FaPalette,
  FaMusic,
  FaGuitar,
  FaHeadphones,
  FaFilm,
  FaCamera,
  FaFutbol,
  FaBasketball,
  // Travel
  FaCar,
  FaPlane,
  FaBicycle,
  FaAnchor,
  // Food
  FaPizzaSlice,
  FaIceCream,
  FaMugHot,
  FaAppleWhole,
  FaCarrot,
  FaCheese,
  FaCookie,
};

/** Selectable icon keys, in display order (used by the popup picker). */
export const USER_ICON_KEYS: string[] = Object.keys(USER_ICONS);
