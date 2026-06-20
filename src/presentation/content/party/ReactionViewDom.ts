import $ from "jquery";

import type { ReactionView } from "@/application/ports";
import type { ReactionType } from "@/domain/reactions";

import { getRandomIntInclusive } from "../dom/utils";
import "./setupEasing";

/** Font Awesome icon classes for each reaction (from the original player.js). */
const REACTION_ICON_CLASSES: Record<ReactionType, string> = {
  fav: "fas fa-heart video_icon fav_video_icon",
  middle_finger: "fas fas fa-hand-middle-finger video_icon middle_finger_video_icon",
  thumbs_up: "fas fas fa-thumbs-up video_icon thumbs_up_video_icon",
  smile: "fas fa-smile-beam video_icon smile_video_icon",
  cry: "fas fa-sad-cry video_icon cry_video_icon",
};

/** Plays the floating reaction-icon animations over the video. */
export class ReactionViewDom implements ReactionView {
  play(type: ReactionType): void {
    const id = "video_icon_" + Math.random().toString(36).slice(-8);
    $(".videoWrapper").append(
      `<i class='${REACTION_ICON_CLASSES[type]}' id='${id}'></i>`,
    );
    $("#" + id).css("left", getRandomIntInclusive(5, 95) + "%");
    const bottom = 150 + getRandomIntInclusive(-50, 50);
    $("#" + id)
      .animate(
        { bottom: bottom + "px" },
        { duration: 500 + getRandomIntInclusive(-150, 150), easing: "easeOutQuart" },
      )
      .delay(500)
      .fadeOut(500 + getRandomIntInclusive(-150, 150), function () {
        $(this).remove();
      });
  }
}
