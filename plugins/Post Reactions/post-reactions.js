/**
* @license
* The MIT License (MIT)
*
* Copyright (c) 2018 pixeldepth.net - http://support.proboards.com/user/2671
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Post_Reactions = function () {
	function Post_Reactions() {
		_classCallCheck(this, Post_Reactions);
	}

	_createClass(Post_Reactions, null, [{
		key: "init",
		value: function init() {
			if (typeof yootil == "undefined") {
				return;
			}

			if (typeof profile_notifications != "undefined" && yootil.location.profile_notifications()) {
				profile_notifications.api.register_parser(this.notification_parser);
			}

			var location_check = yootil.location.recent_posts() || yootil.location.search_results() || yootil.location.thread();

			if (!location_check) {
				return;
			}

			this.setup();

			$(this.ready.bind(this));
		}
	}, {
		key: "ready",
		value: function ready() {
			var _this = this;

			if (yootil.user.logged_in()) {
				this.create_reaction_button();
			}

			yootil.event.after_search(function () {
				_this.create_post_reactions.bind(_this)();
				_this.create_reaction_button();
			});

			this.create_post_reactions();
		}
	}, {
		key: "notification_parser",
		value: function notification_parser(notification) {
			var content = notification.textContent;

			if (content.match(/\{i:(\d+):p(\d+)d:(.+?)\}/g)) {
				var id = parseInt(RegExp.$1, 10);
				var post_id = parseInt(RegExp.$2, 10);
				var name = yootil.html_encode(RegExp.$3, true);

				content = $("<span><a href='/user/" + id + "'>" + name + "</a> reacted to your <a href='/post/" + post_id + "/thread'>post.</a>");
			}

			return content;
		}
	}, {
		key: "setup",
		value: function setup() {
			this.KEY = "pixeldepth_post_reactions";
			this.plugin = proboards.plugin.get(this.KEY);

			if (this.plugin && this.plugin.settings) {
				this.settings = this.plugin.settings || {};
				this.settings.images = this.plugin.images;
			}

			// Create post lookup table for data

			this.lookup = new Map();
			var post_data = proboards.plugin.keys.data[this.KEY];

			for (var key in post_data) {
				this.lookup.set(key, new Post_Reaction_Data(key, post_data[key]));
			}
		}
	}, {
		key: "get_data",
		value: function get_data(post_id) {
			if (!this.lookup.has(post_id.toString())) {
				this.lookup.set(post_id.toString(), new Post_Reaction_Data(post_id));
			}

			return this.lookup.get(post_id.toString());
		}
	}, {
		key: "create_reaction_button",
		value: function create_reaction_button() {
			var $controls = $("tr.item[id^=post-] .controls");

			$controls.each(function () {
				var post_id = Post_Reactions.fetch_post_id(this);

				if (post_id) {
					var user_id = yootil.user.id();
					var reaction_data = Post_Reactions.get_data(post_id);
					var has_reacted = reaction_data && reaction_data.contains(user_id) ? true : false;

					if (has_reacted) {
						var $button = $("<a href='#' data-reaction='" + post_id + "' role='button' class='button state-selected' title='Remove Reaction'><i class='fas fa-thumbs-up' aria-hidden='true'></i></a>");
					} else {
                        var $button = $("<a href='#' data-reaction='" + post_id + "' role='button' class='button' title='Add Reaction'><i class='far fa-thumbs-up' aria-hidden='true'></i></a>");
                    }

					$button.on("click", Post_Reactions.button_handler.bind($button, post_id, user_id));

					$(this).prepend($button);
				}
			});
		}
	}, {
		key: "button_handler",
		value: function button_handler(post_id, user_id) {
			if (!yootil.key.write(Post_Reactions.KEY, post_id)) {
				pb.window.alert("Permission Denied", "You do not have the permission to write to the key for the Post Reactions plugin.");
				return false;
			} else if (yootil.key.space_left(Post_Reactions.KEY) <= 30) {
				pb.window.alert("Post Key Full", "Unfortunately your reaction cannot be saved for this post, as it is out of space.");
				return false;
			}

			var reaction_data = Post_Reactions.get_data(post_id);
			var has_reacted = reaction_data && reaction_data.contains(user_id) ? true : false;

			if (!has_reacted) {
				Post_Reactions.add(reaction_data, post_id, user_id);
			} else {
				Post_Reactions.remove(reaction_data, post_id, user_id);
			}

			return false;
		}
	}, {
		key: "add",
		value: function add(reaction_data, post_id, user_id) {
			pb.window.dialog("pd-post-reactions-dialog", {
				modal: true,
				height: Post_Reactions.settings.dialog_height,
				width: Post_Reactions.settings.dialog_width,
				title: Post_Reactions.settings.dialog_title,
				html: Post_Reactions.possible_reactions(),
				resizable: false,
				draggable: false,
				dialogClass: "pd-post-reactions-dialog",

				open: function open() {
					var $reaction_dialog = $(this);
					var $btn = $("div.pd-post-reactions-dialog").find("button#btn-add-reaction");
					var $items = $reaction_dialog.find("span.pd-post-reactions-dialog-item");

					$btn.css("opacity", 0.6);

					$items.click(function () {
						$items.css("opacity", 0.5).removeAttr("data-selected");
						$(this).css("opacity", 1).attr("data-selected", "selected");

						$btn.css("opacity", 1);
					});
				},

				buttons: [{

					text: "Close",
					click: function click() {
						$(this).dialog("close");
					}

				}, {

					id: "btn-add-reaction",
					text: "Add Reaction",
					click: function click() {
						var $reaction_dialog = $(this);
						var $selected_item = $reaction_dialog.find("span.pd-post-reactions-dialog-item[data-selected]");

						if ($selected_item.length == 1) {
							var id = parseInt($selected_item.attr("data-reaction"), 10);

							reaction_data.add(user_id, id);
							$("a.button[data-reaction='" + post_id + "']").addClass("state-selected");
                            $("a.button[data-reaction='" + post_id + "']").find('i').removeClass('far').addClass('fas');

							Post_Reactions.update_post(reaction_data);

							$reaction_dialog.dialog("close");

							Post_Reactions.notify(post_id);
						}
					}

				}]

			});

			return false;
		}
	}, {
		key: "notify",
		value: function notify(post_id) {
			if (typeof profile_notifications != "undefined") {
				var $user_link = $("#post-" + post_id).find(".o-user-link.user-link[data-id]:first");

				if ($user_link.length) {
					var user_id = parseInt($user_link.attr("data-id"), 10) || 0;

					if (user_id && user_id != yootil.user.id()) {
						profile_notifications.api.create(user_id).notification("{i:" + yootil.user.id() + ":p" + post_id + "d:" + yootil.user.name() + "}");
					}
				}
			}
		}
	}, {
		key: "remove",
		value: function remove(reaction_data, post_id, user_id) {
			reaction_data.remove(user_id);
			this.update_post(reaction_data);
			$("a.button[data-reaction='" + post_id + "']").removeClass('state-selected');
            $("a.button[data-reaction='" + post_id + "']").find('i').removeClass('fas').addClass('far');
		}
	}, {
		key: "possible_reactions",
		value: function possible_reactions() {
			var html = "";

			html += "<div class='pd-post-reactions-table'>";
			html += "<div class='pd-post-reactions-row'>";

			var counter = 0;

			//for(let item of this.settings.possible_reactions){
			for (var i = 0, l = this.settings.possible_reactions.length; i < l; i++) {
				var item = this.settings.possible_reactions[i];

				if (item.staff_only == 1 && !yootil.user.is_staff()) {
					continue;
				}

                var title = "";

                if (this.settings.show_titles == 1) {
                    title = "<span class='pd-post-reactions-item-title'>" + item.title;
                    title += "</span>";
                }

				html += "<div class='pd-post-reactions-cell'>";
				html += "<span class='pd-post-reactions-dialog-item' data-reaction='" + item.unique_id + "'>";
				html += "<i class='" + item.icon_class + "' style='font-size: " + item.icon_size + "; color: #" + item.icon_color + ";' title='" + item.title + "'></i>";
                html += title;
				html += "</span>";
				html += "</div>";

				counter++;

				if (counter == this.settings.reactions_per_row) {
					html += "</div><div class='pd-post-reactions-row'>";
					counter = 0;
				}
			}

			html += "</div>";
			html += "</div>";

			return html;
		}
	}, {
		key: "fetch_post_id",
		value: function fetch_post_id(control) {
			var $post_row = $(control).closest("tr.item.post");
			var post_id_parts = ($post_row.attr("id") || "").split("-");

			if (post_id_parts && post_id_parts.length == 2) {
				return ~~post_id_parts[1];
			}

			return 0;
		}
	}, {
		key: "update_post",
		value: function update_post(reaction_data) {
			if (reaction_data && reaction_data.post_id) {
				var data = reaction_data.data;
				var post_id = reaction_data.post_id;
				var $post_row = $("tr.item.post#post-" + post_id);
                var $foot = $post_row.find("td.foot");
				var $reactions_div = $post_row.find("div.pd-post-reactions-container");

				if (data.constructor == Array && data.length > 0) {
					if (!$reactions_div.length) {
						$reactions_div = $("<div class='pd-post-reactions-container'></div>");

						$foot.prepend($reactions_div);
					}

					$reactions_div.html(Post_Reactions.fetch_post_reactions(reaction_data.data));
				} else if ($reactions_div.length == 1) {
					$reactions_div.remove();
				}
			}
		}
	}, {
		key: "create_post_reactions",
		value: function create_post_reactions() {
			this.lookup.forEach(function (val, key, m) {
				this.update_post(val);
			}.bind(this));
		}
	}, {
		key: "fetch_post_reactions",
		value: function fetch_post_reactions(reaction_data) {
			var counts = new Map();

			for (var data in reaction_data) {
				if (!counts.has(reaction_data[data].r)) {
					counts.set(reaction_data[data].r, 0);
				}

				counts.set(reaction_data[data].r, counts.get(reaction_data[data].r) + 1);
			}

			var html = "";

			counts.forEach(function (val, key, map) {
				var reaction = this.find_reaction(key);

				if (reaction) {
					var total = "";

					if (this.settings.show_counts == 1) {
						total = " x" + val;
					}

					html += "<span class='pd-post-reactions-item' data-reaction='" + reaction.unique_id + "'>";
					html += "<i class='" + reaction.icon_class + "' style='font-size: " + reaction.icon_size + "; color: #" + reaction.icon_color + ";' title='" + reaction.title + total + "'></i>";
					html += total;
					html += "</span>";
				}
			}.bind(this));

			return html;
		}
	}, {
		key: "find_reaction",
		value: function find_reaction() {
			var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

			for (var i = 0, l = this.settings.possible_reactions.length; i < l; i++) {
				if (parseInt(this.settings.possible_reactions[i].unique_id, 10) == id) {
					return this.settings.possible_reactions[i];
				}
			}

			return false;
		}
	}]);

	return Post_Reactions;
}();

var Post_Reaction_Data = function () {
	function Post_Reaction_Data() {
		var post_id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
		var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

		_classCallCheck(this, Post_Reaction_Data);

		this._post_id = post_id;
		this._data = this.parse_data(data);
	}

	_createClass(Post_Reaction_Data, [{
		key: "parse_data",
		value: function parse_data() {
			var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

			var parsed = [];

			if (data.constructor == Array && data.length) {
				for (var i = 0, l = data.length; i < l; i++) {
					//			for(let value of data){
					if (yootil.is_json(data[i])) {
						parsed.push(JSON.parse(data[i]));
					}
				}
			}

			return parsed;
		}
	}, {
		key: "contains",
		value: function contains(user_id) {
			for (var reactor in this._data) {
				//for(let reactors of this._data){
				if (this._data[reactor].u == yootil.user.id()) {
					return true;
				}
			}

			return false;
		}
	}, {
		key: "add",
		value: function add(user_id, reaction_id) {
			var current_data = yootil.key.value(Post_Reactions.KEY, this._post_id);
			var entry = {

				u: user_id,
				r: reaction_id

			};

			var d = JSON.stringify(entry);

			if (!current_data || !current_data.constructor == Array) {
				yootil.key.set(Post_Reactions.KEY, [d], this._post_id);
			} else {
				yootil.key.push(Post_Reactions.KEY, d, this._post_id);
			}

			this._data.push(entry);
		}
	}, {
		key: "remove",
		value: function remove(user_id) {
			var new_data = [];
			var stringed_data = [];

			for (var reactor in this._data) {
				//for(let value of this._data){
				if (this._data[reactor].u != yootil.user.id()) {
					new_data.push(this._data[reactor]);
					stringed_data.push(JSON.stringify(this._data[reactor]));
				}
			}

			this._data = new_data;
			yootil.key.set(Post_Reactions.KEY, stringed_data, this._post_id);
		}
	}, {
		key: "post_id",
		get: function get() {
			return this._post_id;
		}
	}, {
		key: "data",
		get: function get() {
			return this._data;
		}
	}]);

	return Post_Reaction_Data;
}();


Post_Reactions.init();