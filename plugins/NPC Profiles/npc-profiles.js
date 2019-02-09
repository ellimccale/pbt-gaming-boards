if (pbp === undefined) {

    var pbp = {};

}

if (pbp !== null && typeof(pbp) === "object") {

    pbp.v_npc = {

        // Value references
        key: pb.plugin.key('post_rpg_user'),
        settings: pb.plugin.get('user_rpg_profile').settings,
        images: pb.plugin.get('user_rpg_profile').images,
        route: pb.data('route').name,

        // Objects
        list: {},
        menu_list: {
            default: [],
            categories: {}
        },
        available: {},
        parsed: {},
        obj: {},

        // Booleans
        dialog: false,
        disabled: false,
        events_added: false,

        // Functions
        init: function() {

            const plugin = pbp['v_npc'];

            plugin.pbn.button();
            plugin.menu.create();

            if (plugin.route.match(/^home|board|forum|recent_threads|search_results$/)) {

                plugin.thread_list();

            }

            if (plugin.route.match(/^thread|permalink|recent_posts|all_recent_posts|search_results|new_post|new_thread|edit_post|quote_posts$/)) {

                plugin.post_list();

            }

            if (plugin.route === 'user' && location.pathname.indexOf('/npc/') !== -1) {

                plugin.profile();

            }

            if (plugin.route === 'members') {

                plugin.members();

            }

            plugin.placeholder();

        },

        // Confirm that user is in group required to use an NPC
        in_group: function(npc_groups_array) {

            const plugin = pbp['v_npc'];

            let my_group_ids = pb.data('user').group_ids;

            if (pb.data('user').id === 1 && !plugin.settings.npclist_admin.length) {

                return true;

            }

            if (my_group_ids) {

                my_group_ids = my_group_ids.map(num => num.toString());

                for (let i in npc_groups_array) {

                    if (my_group_ids.indexOf(npc_groups_array[i]) > -1) {

                        return true;

                    }

             }

            }

            return false;

        },

        // Check all required fields for NPC's existence
        npc_exists: function(npc) {

            const plugin = pbp['v_npc'];

            if (plugin.list[npc] && plugin.list[npc].name && plugin.list[npc].display) {

                return true;

            }

            return false;

        },

        // NPC dropdown creation/functions
        menu: {

            // List HTML holder
            list: '',

            // Button creation
            create: function() {

                const plugin = pbp['v_npc'];

                if (pb.data('user').is_logged_in) {

                    if (!plugin.disabled && Object.keys(plugin.available).length) {

                        // We have to filter out the WYSIWYG area in PMs for now, but we should be able to use it in v6
                        let $menu_elements = $('#v-npc-pbn-micro, .posts .item.post');

                        if (!pbp['v_npc'].route.match(/new_conversation|new_message|quote_messages/)) {

                            $menu_elements = $menu_elements.add('.wysiwyg-area');

                        }

                        // Add dropdown
                        $menu_elements.each(function() {

                            let controls_class = $(this).find('.o-npc-controls').length ? '.o-npc-controls' : '.controls';
                            let item_none = '<li class="o-npc-menu__item"><a class="o-npc-menu__link" data-npc="">None</a></li>';

                            if ($(this).attr('id') === 'v-npc-pbn-micro') {

                                item_none = '';

                            }

                            $(this).find(controls_class).addClass('o-npc-controls').append(plugin.obj.button + '<ul class="options_menu ui-menu hide ui-helper-clearfix ui-selectMenu o-npc-menu" style="display: none;">' + item_none + plugin.menu.list + '</ul>');

                            if ($(this).find(controls_class).find('#posting-options-container').length) {

                                $(this).find('.o-npc-button, .o-npc-menu').insertBefore($(this).find('.posting-options-list')).after('\n');

                            }

                        });

                        // Dropdown item click event
                        $('.o-npc-menu').on('mousedown', function(e) {

                            e.stopPropagation();

                        }).find('a').on('click', function() {

                            let $post = $(this).parents('.item.post');
                            let $pbn_micro = $(this).parents('#v-npc-pbn-micro');
                            let $controls = $(this).parents('.o-npc-controls');
                            let $your_choice = $(this).parent();
                            let npc = $(this).attr('data-npc');

                            if (npc || npc === '') {

                                if ($pbn_micro.length) {

                                    // PBN bar behavior
                                    plugin.pbn.load($(this).attr('data-npc'));

                                } else if ($post.length) {

                                    // Thread behavior
                                    let post_id = $(this).parents('.item.post').attr('id').split('-')[1];

                                    $post.addClass('is-loading-npc');

                                    plugin.key.set({

                                        object_id: post_id,
                                        value: $(this).attr('data-npc'),
                                        success: function() { plugin.post_list(); },
                                        error: function() { pb.window.alert('Error', 'There was an error saving the NPC data to the post. Please try again in a moment.'); },
                                        complete: function() { $post.removeClass('is-loading-npc'); }

                                    });

                                } else {

                                    // Posting page behavior
                                    plugin.menu.update($your_choice.parents('.o-npc-menu'),npc);

                                    plugin.set_on(npc);

                                }

                                $(this).parents('.o-npc-menu').hide();

                            }

                        });

                        // Prepopulate posting page selection if PBN bar is in use
                        if ($('.wysiwyg-area').length && sessionStorage['v_npc_pbn']) {

                            let session_npc = JSON.parse(sessionStorage['v_npc_pbn']).npc;

                            plugin.menu.update($('.wysiwyg-area .o-npc-menu'), session_npc);

                        }

                    }

                    plugin.menu.events.bind();

                }

            },

            // Update the provided menu element to highlight the specified NPC
            update: function($menu, npc) {

                if ($menu.length) {

                    $menu.find('.is-selected').removeClass('is-selected');

                    $menu.parents('.o-npc-controls, .item.post').last().removeClass('has-npc');

                    if (npc) {

                        $menu.find('a[data-npc="' + npc + '"]').parent().addClass('is-selected').parents('.o-npc-menu__item.ui-menu-has-sub-menu').addClass('is-selected');

                        $menu.parents('.o-npc-controls, .item.post').last().addClass('has-npc');

                    }

                }

            },

            events: {

                // Add each of the events in this object if a button exists on the page
                bind: function() {

                    const plugin = pbp['v_npc'];

                    if (!plugin.events_added && $('.o-npc-button').length) {

                        $(document).on('mousedown', function(e) {

                            plugin.menu.events.toggle(e);

                        });

                        $(document).on('mouseenter', '.ui-menu-has-sub-menu.o-npc-menu__item', function(e) {

                            plugin.menu.events.submenu.on(e);

                        }).on('mouseleave', '.ui-menu-has-sub-menu.o-npc-menu__item', function(e) {

                            plugin.menu.events.submenu.off(e);

                        });

                        plugin.events_added = true;

                    }

                },

                // Menu click events for document
                toggle: function(e) {

                    $('.o-npc-menu').each(function() {

                        if ($(this).is(':visible') && !$(this).parents('.o-npc-controls').find('.o-npc-button').is($(e.target).closest('.o-npc-button'))) {

                            $(this).hide();

                        }

                    });

                    if ($(e.target).closest('.o-npc-button').length && e.which === 1) {

                        $(e.target).parents('.o-npc-controls').find('.o-npc-menu').each(function() {

                            let $button = $(this).parents('.o-npc-controls').find('.o-npc-button');

                            let button_position = function(pos) {

                                if ($button.css('margin-' + pos) && $button.css('margin-' + pos).indexOf('px') !== -1) {

                                    return parseInt($button.css('margin-' + pos).split('px')[0]);

                                }

                                return 0;

                            };

                            $(this).css('left', (($button.position().left + $button.outerWidth() + button_position('left')) - $(this).outerWidth()) + 'px');

                            $(this).css('top', $button.position().top + $button.outerHeight() + button_position('top') + 'px');

                            $(this).toggle();

                            if ($(this).offset().top + $(this).outerHeight() > $(window).height() + $(window).scrollTop()) {

                                $(this).css('top', ($button.position().top - $(this).outerHeight()) + button_position('top') + 'px');

                            }

                        });

                    }

                },

                // Submenus
                submenu: {

                    on: function(e) {

                        const plugin = pbp['v_npc'];

                        let item = $(e.currentTarget);
                        let menu = item.children('ul').first();

                        let item_pos = {

                            x: item.position().left + item.outerWidth(),
                            y: -3

                        };

                        clearTimeout(plugin.menu_timeout);

                        $('.o-npc-menu__submenu.is-visible').removeClass('is-visible state-timeout-hiding');

                        menu.addClass('is-visible');

                        menu.css('left', item_pos.x + 'px').css('top', item_pos.y + 'px');

                        if (menu.offset().left + menu.outerWidth() > $(window).width()) {

                            item_pos.x = item.position().left - menu.outerWidth();

                        }

                        if (menu.offset().top + menu.outerHeight() > $(window).height() + $(window).scrollTop()) {

                            item_pos.y = item.outerHeight() - menu.outerHeight() + 3;

                        }

                        menu.css('left', item_pos.x + 'px').css('top', item_pos.y + 'px');

                    },

                    off: function(e) {

                        const plugin = pbp['v_npc'];

                        let menu = $('.o-npc-menu__submenu.is-visible').addClass('state-timeout-hiding');

                        plugin.menu_timeout = setTimeout(function() {

                            $('.o-npc-menu__submenu.state-timeout-hiding').removeClass('is-visible state-timeout-hiding');

                        }, 500);

                    }

                }

            }

        },

        // Thread list NPC population
        thread_list: function() {

            const plugin = pbp['v_npc'];

            if ($('.item.thread').length) {

                $('.threads .item.thread').each(function() {

                    let thread = pb.item('thread', $(this).attr('id').split('-')[1]);

                    let npc = {

                        'created-by': plugin.key.get(thread.first_post_id),
                        'latest': plugin.key.get(thread.last_post_id)

                    };

                    for (let i in npc) {

                        if (!$(this).find('[data-item="' + i + '"]').length && npc[i]) {

                            if (plugin.list[npc[i]]) {

                                $(this).find('.' + i).find('.user-link, span.user-guest').first().replaceWith('<span data-item="' + i + '"></span>');

                            }

                        }

                    }

                });

            }

        },

        // Post list NPC population
        post_list: function() {

            const plugin = pbp['v_npc'];

            // Posts
            $('.posts .item.post').each(function() {

                let post_id = $(this).attr('id').split('-')[1];
                let npc = plugin.key.get(post_id);

                $(this).removeClass('has-npc').find('.o-npc-menu').find('li').removeClass('is-selected');

                $(this).find('.is-npc-element').remove();

                $(this).find('.quote').removeClass('has-npc');

                if (npc && plugin.npc_exists(npc) && !$(this).hasClass('has-npc')) {

                    $(this).addClass('has-npc');

                    if ($('.posts.summary').length) {

                        // Posting page thread summary
                        let $tag = $(this).find('.author').find('.user-link');

                        if (!$(this).find('[data-item="created-by"]').length) {

                            $(this).find('.author').find('.user-link, span.user-guest').first().replaceWith('<span data-item="created-by"></span>');

                        }

                        $(this).find('[data-item="created-by"]').html('<a itemprop="url" class="user-link user-1 group-1" href="/user/1/npc/' + npc + '">' + plugin.list[npc].display + '</a>');

                        if (plugin.list[npc].color) {

                            $(this).find('[data-item="created-by"]').children('.user-link').css('color', '#' + plugin.list[npc].color);

                        }

                        if ($tag.length) {

                            $(this).find('[data-item="created-by"]').children('.user-link').attr('title', $tag.attr('title') + ':' + npc);

                        } else {

                            $(this).find('[data-item="created-by"]').children('.user-link').attr('title', '@admin:' + npc);

                        }

                    } else {

                        // Post list
                        if (!plugin.settings.hide_sig.toString()){

                            $(this).find('.foot').append('<div class="signature is-npc-element o-npc-signature">Posted by: </div>');

                            if ($(this).find('.mini-profile').first().find('.user-link').length) {

                                $(this).find('.o-npc-signature').append($(this).find('.mini-profile').first().find('.user-link').first().clone());

                            } else {

                                $(this).find('.o-npc-signature').append('<span class="guest">Guest</span>');

                            }

                        }

                        plugin.menu.update($(this).find('.o-npc-menu'), npc);

                        let $mini_parent = $(this).find('.mini-profile').first().parent();

                        $mini_parent.append('<div class="mini-profile is-npc-element o-npc-mini">' + plugin.mini(post_id, npc) + '</div>');

                    }

                }

            });

            // Quotes
            $('.posts .item.post .quote').each(function() {

                if ($(this).attr('source')) {

                    if ($(this).attr('source').indexOf('/post/') === 0) {

                        let post_id = $(this).attr('source').split('/post/')[1].split('/thread')[0];

                        if (plugin.key.get(post_id)) {

                            $(this).addClass('has-npc');

                            let npc = plugin.key.get(post_id);

                            if (plugin.npc_exists(npc) && $(this).children('.quote_body').children('.quote_header').length) {

                                let $clone = $(this).children('.quote_body').children('.quote_header').clone().addClass('is-npc-element');
                                let avatar = plugin.list[npc].avatar || plugin.images.default;

                                if ($(this).find('.quote_header').find('.user-link').length) {

                                    let tag = $clone.find('.user-link').attr('title');

                                    $clone.find('.user-link').attr('title', tag + ':' + npc).attr('href', '/user/1/npc/' + npc).html(plugin.list[npc].display);

                                    if (plugin.list[npc].color) {

                                        $clone.find('.user-link').css('color', '#' + plugin.list[npc].color);

                                    }

                                    $clone.insertAfter($(this).children('.quote_body').children('.quote_header'));

                                    $(this).children('.quote_body').children('.quote_avatar_container').clone().addClass('is-npc-element').children('.avatar-wrapper').attr('title', plugin.list[npc].display).css('border-color', '#' + plugin.list[npc].color).children('img').attr('alt', plugin.list[npc].display + ' Avatar').attr('src', avatar).parents('.quote_avatar_container').insertAfter($(this).children('.quote_body').children('.quote_avatar_container'));

                                } else {

                                    $clone.html($clone.html().replace(/<\/a> (\S+ )+said:/, '</a> <a title="@admin:' + npc + '" itemprop="url" class="user-link user-1 group-1" href="/user/1/npc/' + npc + '">' + plugin.list[npc].display + '</a> said:'));

                                    if (plugin.list[npc].color) {

                                        $clone.find('.user-link').css('color', '#' + plugin.list[npc].color);

                                    }

                                    $clone.insertAfter($(this).children('.quote_body').children('.quote_header'));

                                    $(this).children('.quote_body').children('.no_avatar_placeholder').after('<div class="quote_avatar_container is-npc-element"><div style="border-color: #' + plugin.list[npc].color + ';" title="' + plugin.list[npc].display + '" class="avatar-wrapper avatar_size_quote avatar-1"><img alt="' + plugin.list[npc].display + ' Avatar" src="' + plugin.images.avatar + '"></div></div>');

                                }

                            }

                        }

                    }

                }

            });

            // Tagging
            $('.posts .item.post span[itemtype$="/Person"]').parent().contents().filter(function(i) {

                let $next = $('.posts .item.post span[itemtype$="/Person"]').parent().contents().eq(i + 1);

                if ($(this).is('span[itemtype$="/Person"]') && $(this).find('.user-link').length && $next.length) {

                    if ($next[0].nodeType === 3) {

                        let $text_node = $next[0];
                        let match = $text_node.textContent.match(/:(\w|\d)+/);

                        if (match) {

                            if ($text_node.textContent.indexOf(match[0]) === 0) {

                                if (plugin.npc_exists(match[0].split(':')[1])) {

                                    let $tag = $(this).find('.user-link');
                                    let original_username = $tag.attr('title');
                                    let npc = match[0].split(':')[1];

                                    $text_node.textContent = $text_node.textContent.replace(match[0], '');

                                    $tag.replaceWith('<a title="' + original_username + ':' + npc + '" itemprop="url" class="user-link" href="/user/1/npc/' + npc + '">' + plugin.list[npc].display + '</a>');

                                    if (plugin.list[npc].color) {

                                        $(this).find('.user-link').css('color', '#' + plugin.list[npc].color);

                                    }

                                }

                            }

                        }

                    }

                }

            });

        },

        // Placeholder element population
        placeholder: function() {

            const plugin = pbp['v_npc'];

            $('[data-item="created-by"], [data-item="latest"], [data-item="last-updated"], [data-item="created-by-avatar"], [data-item="latest-avatar"], [data-item="last-updated-avatar"]').not('.has-npc, .no-npc').each(function() {

                let npc;

                if ($(this).parents('.item.thread').length) {

                    let thread = pb.item('thread', $(this).parents('.item').attr('id').split('-')[1]);

                    if ($(this).attr('data-item').match('created-by')) {

                        npc = plugin.key.get(thread.first_post_id);

                    } else if ($(this).attr('data-item').match('latest')) {

                        npc = plugin.key.get(thread.last_post_id);

                    }

                } else {

                    npc = plugin.key.get($(this).attr('data-value'));

                }

                if (npc && plugin.npc_exists(npc)) {

                    $(this).addClass('has-npc');

                    let $avatar = $(this).find('.avatar-wrapper');

                    if ($avatar.length || $(this).attr('data-item').indexOf('avatar') !== -1) {

                        let avatar_url = plugin.images.default;
                        let color = 'transparent';

                        if (plugin.list[npc].avatar) {

                            avatar_url = plugin.list[npc].avatar;

                        }

                        if (plugin.list[npc].color) {

                            color = '#' + plugin.list[npc].color;

                        }

                        $avatar.css('border-color', color).attr('title', plugin.list[npc].display);

                        $avatar.find('img[alt$=" Avatar"]').attr('src', avatar_url).attr('alt', plugin.list[npc].display + ' Avatar');

                    } else {

                        $(this).html('<a itemprop="url" class="user-link user-1 group-1" href="/user/1/npc/' + npc + '" title="@admin:' + npc + '">' + plugin.list[npc].display + '</a>');

                        if (plugin.list[npc].color) {

                            $(this).find('.user-link').css('color', '#' + plugin.list[npc].color);

                        }

                    }

                } else {

                    $(this).addClass('no-npc');

                }

            });

        },

        // PBN bar functionality
        pbn: {

            // Page load
            button: function() {

                const plugin = pbp['v_npc'];

                if (!$('#v-npc-pbn').length && pb.data('user').is_logged_in && Object.keys(plugin.available).length) {

                    $('#pbn-bar').width('auto').append('<a id="v-npc-pbn"><img class="o-npc-icon-off" title="Post As NPC" alt="Post As NPC" src="' + plugin.images.sword + '"><img class="o-npc-icon-on" title="Post As NPC" alt="Post As NPC" src="' + plugin.images.sword_s + '"></a>');

                    $('body').append(plugin.obj.micro_control);

                    let $pbn = $('#v-npc-pbn');
                    let $pbn_micro = $('#v-npc-pbn-micro');

                    if (plugin.disabled) {

                        $pbn.children('img').css('opacity', 0.25);

                    }

                    $pbn.on('click',function() {

                        $pbn_micro.toggleClass('is-hidden');

                        plugin.pbn.save();

                    });

                    if (sessionStorage['v_npc_pbn']) {

                        let session = JSON.parse(sessionStorage['v_npc_pbn']);

                        if (session.pbn) {

                            $pbn_micro.removeClass('is-hidden');

                        }

                        plugin.pbn.load(session.npc);

                    }

                }

            },

            // Save PBN bar state to sessionStorage
            save: function(npc) {

                let hash = {};
                let session = sessionStorage['v_npc_pbn'];

                if (npc) {

                    hash.npc = npc;

                } else if (npc !== null && session && JSON.parse(session).npc) {

                    hash.npc = JSON.parse(session).npc;

                }

                hash.pbn = !$('#v-npc-pbn-micro').hasClass('is-hidden');

                sessionStorage['v_npc_pbn'] = JSON.stringify(hash);

            },

            // Select NPC
            load: function(npc) {

                const plugin = pbp['v_npc'];

                let $pbn = $('#v-npc-pbn');
                let $pbn_micro = $('#v-npc-pbn-micro');
                let $pbn_micro_control = $('#v-npc-pbn-micro .o-npc-micro--control');
                let $pbn_micro_npc = $('#v-npc-pbn-micro .o-npc-micro--npc');

                $pbn.removeClass('is-active');

                $pbn_micro_npc.remove();

                if (!plugin.available[npc]) {

                    plugin.set_on('');

                } else if (plugin.available[npc]) {

                    plugin.set_on(npc);

                    $pbn.addClass('is-active');

                    $pbn_micro.addClass('is-active');
                    $pbn_micro.append(plugin.parse(npc, [], plugin.obj.micro, 'micro'));

                    $pbn_micro_npc = $('#v-npc-pbn-micro .o-npc-micro--npc');

                    $pbn_micro_npc.find('.o-npc-avatar__overlay').html('You');
                    $pbn_micro_npc.find('.avatar').addClass('js-close');
                    $pbn_micro_npc.find('.avatar').append('<div class="o-npc-avatar__close has-animation"><div class="o-npc-avatar__close-inner"><div class="o-npc-avatar__overlay o-npc-avatar__overlay--close">Remove</div><div class="o-npc-avatar__x"><span></span></div></div></div>');
                    $pbn_micro_npc.find('.avatar').find('.o-npc-avatar__x').css('line-height', ($pbn_micro_npc.find('.avatar').outerHeight() - $pbn_micro_npc.find('.o-npc-avatar__overlay--close').outerHeight()) + 'px');

                    $pbn_micro_npc.find('.js-close').click(function() {

                        plugin.pbn.save(null);

                        plugin.set_on('');

                        $pbn_micro_npc.remove();

                        $pbn.removeClass('is-active');

                        $pbn_micro.removeClass('is-active');

                        if ($('.wysiwyg-area').length) {

                            plugin.menu.update($('.wysiwyg-area .o-npc-menu'));

                        }

                    });

                    if ($('.wysiwyg-area').length) {

                        plugin.menu.update($('.wysiwyg-area .o-npc-menu'), npc);

                    }

                    plugin.pbn.save(npc);

                }

            }

        },

        // User profile
        profile: function() {

            const plugin = pbp['v_npc'];

            if (pb.data('page').member) {

                let npc = location.pathname.split('/npc/')[1];

                if (plugin.npc_exists(npc)) {

                    let $user = $('<a itemprop="url" class="user-link user-1 group-1" href="/user/' + pb.data('page').member.id + '">' + pb.data('page').member.name + '</a>');

                    $(document).attr('title', $(document).attr('title').replace(pb.data('page').member.name, plugin.list[npc].display));

                    $('.container.show-user').hide().after(plugin.parse(npc, $user, plugin.obj.profile, 'profile'));
                    $('#nav-tree-branch-1 > div > a').attr('href', '/members/npc').html('NPCs');
                    $('#nav-tree-branch-2 > div > a').attr('href', $('#nav-tree-branch-2 > div > a').attr('href') + '/npc/' + npc);
                    $('#nav-tree-branch-2 > div > a > span').html(plugin.list[npc].display);

                }

            }

        },

        // Member list
        members: function() {
            const plugin = pbp['v_npc'];

            plugin.route = "list_members";

            $('#nav-tree-menu-1').prepend('<li class="nav-tree-members-npc"><a href="/members/npc"><span class="item-text">NPCs</span><div class="clear"></div></a></li>');

            $('.container.members .control-bar .controls .ui-menu.views').prepend('<li class="viewNPC"><a href="/members/npc">View NPCs</a></li>');

            if (location.pathname === '/members/npc') {

                $('#nav-tree-branch-2 > div > a').attr('href', '/members/npc').html('NPC List');

                $('.container.members').html('<div class="title-bar"><h2>NPC List</h2></div><div class="content"></div>');

                let $npc_table = $('<table class="list o-npc-list"><thead><tr class="head o-npc-list__head"><th class="o-npc-list__column o-npc-list--avatar"></th><th class="o-npc-list__column o-npc-list--name">Name</th><th class="o-npc-list__column o-npc-list--group">Group</th></tr></thead></table>');
                let $npc_list = $('<tbody class="list-content">');

                for (let npc in plugin.list) {

                    $npc_list.append(plugin.parse(npc, [], plugin.obj.member, 'list'));

                }

                $('.container.members > .content').append($npc_table.append($npc_list));

                $('.container.members .o-npc-list__item').on('click', function() {

                    location.href = $(this).find('.user-link').first().attr('href');

                });

            }

        },

        // Set NPC to plugin key on post
        set_on: function(npc) {

            var plugin = pbp['v_npc'];

            if (!plugin.disabled) {

                if (plugin.available[npc] || !npc) {

                    plugin.key.set_on('post_quick_reply', npc);
                    plugin.key.set_on('thread_new', npc);
                    plugin.key.set_on('post_new', npc);

                }

            }

        },

        // Get mini-profile HTML for this NPC, then send to parse()
        mini: function(post_id, npc) {

            const plugin = pbp['v_npc'];

            let html = plugin.obj.mini;
            let $user = $('#post-' + post_id + ' .mini-profile').first().find('.user-link').first();

            if (plugin.list[npc].html) {

                html = plugin.list[npc].html;

            }

            return plugin.parse(npc, $user, html, 'mini');

        },

        // Construct and return mini-profile or micro-profile
        parse: function(npc, $user, input_html, type) {

            const plugin = pbp['v_npc'];

            let html_container = type === 'list' ? '<tbody>' : '<div>';
            let this_npc = plugin.list[npc];

            if (type === 'mini' && plugin.parsed[npc]) {

                let $mini = $(html_container).append(plugin.parsed[npc]);

                if ($user.length) {

                    $mini.find('.user-link').attr('title', $user.attr('title') + ':' + npc);

                }

                return $mini.html();

            } else {

                // Clone this NPC from the list and reassign any legacy properties
                let npc_keys = $.extend({}, this_npc);
                npc_keys.username = npc_keys.name;
                npc_keys.name = npc_keys.display;

                // Manually format any keys belonging to special variables
                // $[user]
                if ($user.length){

                    $user = $user.first().clone();

                    $user.attr('href', '/user/1/npc/' + npc).attr('title', $user.attr('title') + ':' + npc);

                    $user.removeAttr('style class').addClass('user-link group-0');

                    $user.html(npc_keys.name);

                } else {

                    $user = $('<a href="/user/1/npc/' + npc + '" title="@admin:' + npc + '" class="user-link group-0">').html(npc_keys.name);

                }

                // $[user.avatar]
                let avatar_url = !npc_keys.avatar && type !== 'mini' ? plugin.images.default : npc_keys.avatar;

                if (avatar_url) {

                    npc_keys.avatar = '<div class="avatar-wrapper avatar_size_default"><img src="' + avatar_url + '" alt="' + pb.text.escape_html(npc_keys.name) + ' Avatar"></div>';

                }

                // $[user.stars]
                if (npc_keys.stars) {

                    npc_keys.stars = $('<img alt="*">').attr('src', npc_keys.stars)[0].outerHTML;

                    if (parseInt(npc_keys.star_count) > 0) {

                        npc_keys.stars = npc_keys.stars.repeat(npc_keys.star_count);

                    }

                }

                // $[user.color]
                if (npc_keys.color) {

                    npc_keys.color = '#' + npc_keys.color;

                    if ($user.length) {

                        $user.css('color', npc_keys.color);

                    }

                }

                // Replace variables and remove data-item elements
                let info = [];
                let $html_temp;

                let html = (function() {

                    // Manual replacement for $[user] and $[user.avatar.src]
                    let regex_user = new RegExp('\\$\\[user\\]', 'g');
                    input_html = input_html.replace(regex_user, $user[0].outerHTML);

                    let regex_avatar_src = new RegExp('\\$\\[user\\.avatar\\.src\\]', 'g');
                    input_html = input_html.replace(regex_avatar_src, avatar_url);

                    // Automatic from object
                    for (let this_key in npc_keys) {

                        $html_temp = $(html_container).append(input_html);

                        // data-item management
                        if (!npc_keys[this_key]) {

                            $html_temp.find('[data-item="' + this_key + '"]').remove();

                        } else {

                            $html_temp.find('[data-default="' + this_key + '"]').remove();

                        }

                        input_html = $html_temp.html();

                        let regex_keys = new RegExp('\\$\\[user\\.(' + this_key + ')\\]', 'g');

                        input_html = input_html.replace(regex_keys, '${npc_keys.$1}');

                    }

                    return input_html;

                })();

                // Nuke "info" element if none of its properties were filled out
                if (!info.length) {

                    $html_temp = $(html_container).append(html)

                    $html_temp.find('[data-item="info"]').remove();

                    html = $html_temp.html();

                }

                // Convert "$html" to `$html` and replace its template literals
                let string_to_literal = new Function("npc_keys", "return `" + html + "`;");
                html = string_to_literal(npc_keys);

                // Save this mini-profile for future use
                if (type === "mini") {

                    plugin.parsed[npc] = html;

                }

                return html;

            }

        },

        // Expansion support
        exp: function(plugin_id) {

            const plugin = pbp['v_npc'];

            let expansion_npc_list = pbp[plugin_id].settings.groups;

            expansion_npc_list.forEach((n) => {

                let this_npc = n;
                let name = this_npc.name;
                let display = this_npc.display;
                let html = this_npc.html;
                let existing_html;

                // Mini-Profile HTML
                if (html && name) {

                    if (plugin.list[name]) {

                        plugin.list[name].html = html;

                    } else {

                        plugin.list[name] = this_npc;

                    }

                }

                // NPC Profiles & Expansions
                if (!html && name && display) {

                    if (plugin.list[name] && plugin.list[name].html) {

                        existing_html = plugin.list[name].html;

                    }

                    plugin.list[name] = this_npc;

                    if (existing_html !== undefined) {

                        plugin.list[name].html = existing_html;

                    }

                    // Permissions and menu dropdown preparation
                    if (plugin.in_group(this_npc.permissions)) {

                        // Permissions
                        plugin.available[name] = true;

                        // Menu category
                        let this_item = '<li class="o-npc-menu__item"><a class="o-npc-menu__link" data-npc="' + name + '">' + plugin.list[name].display + '</a></li>';
                        let this_item_category = plugin.list[name].category;

                        if (this_item_category) {

                            if (!plugin.menu_list.categories.hasOwnProperty(this_item_category)) {

                                plugin.menu_list.categories[this_item_category] = [];

                            }

                            plugin.menu_list.categories[this_item_category].push(this_item);

                        } else {

                            plugin.menu_list.default.push(this_item);

                        }

                    }

                }

            });

        }

    }

}

(function() {

    const plugin = pbp['v_npc'];

    // HTML templates
    plugin.obj.button = '<a class="button o-npc-button" title="Apply NPC to Post" role="button"><i class="far fa-swords o-npc-icon-off"></i><i class="far fa-swords o-npc-icon-on"></i><img src="' + plugin.images.circle + '" alt="NPC" class="o-npc-icon-load"></a>';

    plugin.obj.profile = plugin.settings.profile || '<div class="container show-user o-npc-profile"> <div class="content"> <div class="show-user__cover-image"></div><div class="show-user__user"> <div class="show-user__user-avatar"> $[user.avatar] <div class="avatar-wrapper avatar_size_default" data-default="avatar"> <img src="' + plugin.images.default + '" alt="$[user.username] Avatar"> </div></div><div class="show-user__user-fields"> <span class="username" style="color: $[user.color];"> $[user.name] </span> <span class="user-group">$[user.group]</span> <span class="user-stars">$[user.stars]</span> </div></div><div class="show-user__content"> <div class="show-user__summary"> <div class="show-user__summary-col show-user__summary-col--left"> <div class="show-user__summary-status"> <p class="show-user__summary-status-text">I\'m just a bot! Nothing to see here, beep boop.</p></div></div></div></div></div></div>';

    plugin.obj.mini = plugin.settings.mini || '<div class="mini-profile__avatar"> $[user.avatar] <div class="avatar-wrapper avatar_size_default" data-default="avatar"> <img src="' + plugin.images.default + '" alt="$[user.username] Avatar"> </div></div><span class="mini-profile__name">$[user]</span><span class="mini-profile__group">$[user.group]</span><span class="mini-profile__stars">$[user.stars]</span>';

    plugin.obj.micro = '<div class="micro-profile o-npc-micro o-npc-micro--npc" data-npc="$[user.username]"><div class="avatar o-npc-avatar o-avatar--small"><div class="o-npc-avatar__overlay o-npc-avatar__overlay--npc has-animation">NPC</div><div class="avatar-wrapper avatar_size_small"><img src="$[user.avatar.src]" alt="$[user.name] Avatar"></div></div><div class="info"><div class="nowrap"><span class="name"><a href="/user/1/npc/$[user.username]" style="color: $[user.color];" class="user-link" title="@admin:$[user.username]">$[user.name]</a></span> <span class="small"></span></div><div class="nowrap group-overflow">$[user.group]</div><div class="nowrap">$[user.stars]</div></div></div>';

    plugin.obj.micro_control = '<div id="v-npc-pbn-micro" class="is-hidden"><div class="micro-profile o-npc-micro o-npc-micro--control"><div class="o-npc-controls"></div><div class="avatar o-npc-avatar o-avatar--small"><div class="o-npc-avatar__overlay">NPC</div><div class="avatar-wrapper avatar_size_small"><img src="' + plugin.images.default + '" alt="NPC Avatar"></div></div><div class="info"><div class="small"><b>NPC Auto-Select</b><br>Click this icon to choose an NPC to automatically select on the posting page.</div></div></div></div>';

    plugin.obj.member = '<tr class="item member o-npc-list__item"><td class="o-npc-list__column o-npc-list--avatar"><div class="avatar o-npc-avatar o-avatar--small"><div class="o-npc-avatar__overlay">NPC</div>$[user.avatar]</div></td><td class="o-npc-list__column o-npc-list--name">$[user]</td><td class="o-npc-list__column o-npc-list--group">$[user.group]</td></tr><tr class="spacer"><td colspan="3"></td></tr>';

    // Blacklist
    let board = pb.data('page').board;

    if (board) {

        let user_id = pb.data('user').id;
        let blacklist = plugin.settings.blacklist;
        let admin_also_blacklisted = plugin.settings.blacklist_admin.length;

        if (user_id !== 1 || (user_id === 1 && admin_also_blacklisted)) {

            let is_listed = ($.inArray(board.id.toString(), blacklist) !== -1);
            let list_type = plugin.settings.list_type.toString();

            if ((is_listed && !list_type) || (!is_listed && list_type)) {

                plugin.disabled = true;

            }

        }

    }

    // Expansions
    plugin.exp('v_npc');

    if (pbp['v_npc_ex']) {

        for (let i in pbp.v_npc_ex) {

            plugin.exp(pbp.v_npc_ex[i]);

        }

    }

    // Dropdown menu finalization
    let dropdown_list = [];

    for (let category in plugin.menu_list.categories) {

        let this_category = '<li class="ui-menu-has-sub-menu o-npc-menu__item"><a class="o-npc-menu__link">' + category + '</a><ul class="o-npc-menu__submenu">' + plugin.menu_list.categories[category].join('') + '</ul><span class="arrow right"><span></span></span></li>';

        dropdown_list.push(this_category);

    }

    plugin.menu.list = dropdown_list.join('') + plugin.menu_list.default.join('');

})();

$(function() {

    const plugin = pbp['v_npc'];

    if (!$('#v_npc_style').length) {

        $('head').append($('<style id="v_npc_style">').append('.o-npc-menu li a { background-image: url(' + plugin.images.checked + '); }'));

    }

    plugin.init();

    if (plugin.route === "thread" && location.href.indexOf('scrollTo=') !== -1) {

        $('html, body').animate({

            scrollTop: $('#post-' + location.href.split('scrollTo=')[1].split('&')[0]).offset().top - $('.control-bar').outerHeight()

        }, 0);

    }

    pb.events.on('afterSearch', plugin.init);

});