function set_RT() {
    if ($('#RT-parent').length === 0) {
        return;
    }
    
    if (proboards.data('user').is_logged_in === 0) {
        var user_is = 'g';
    } else if(proboards.data('user').is_staff === 0) {
        var user_is = 'm';
    } else {
        var user_is = 's';
    }
    
    if (pb.plugin.get('recently_updated_threads').settings.container_id === '') {
        $('#RT-parent').css('display', '');
    }

    $('#RT-Master').css('display', '');

    var getThreads = pb.plugin.key('updated_threads').get();

    if (getThreads.length !== undefined) {
        // Check for duplicates and length...
        getThreads = pb.plugin.key('updated_threads').get().slice();
        
        // Add threads to cell...
        for (g = getThreads.length - 1; g > 0; g--) {
            var div = document.createElement('div');
            div.className = 'recent-threads-item';

            if (getThreads[g].length > 6 && getThreads[g].match(/\|/)) {
                getThreads[g] = getThreads[g].split('|');
            }
            
            if (pb.plugin.get('recently_updated_threads').settings.insite_forwarding === 'y') {
                getThreads[g][0] = '/forum' + getThreads[g][0];
                getThreads[g][0] = getThreads[g][0].replace('forum/forum','forum');
            }
            
            if (pb.plugin.get('recently_updated_threads').settings.display_html !== '') {
                var threadCode = pb.plugin.get('recently_updated_threads').settings.display_html;
                var B_Title = getThreads[g][1];
                div.title = B_Title;
                var T_Title = '<a href=' + getThreads[g][0] + 'class="recent-threads-title">' + getThreads[g][5] + '</a>';
                var T_Peep = '<a href="/user/' + getThreads[g][3] + '" class="user-link user-' + getThreads[g][3] + ' group-' + getThreads[g][4] + '">' + getThreads[g][2] + '</a>';

                if (getThreads[g].length > 6) {
                    var T_Av = '<img src="' + getThreads[g][6] + '" class="recent-avatar">';
                    threadCode = threadCode.replace(/\[A\]/ig,T_Av);
                } else {
                    var T_Av = '<img src="' + pb.plugin.get('recently_updated_threads').images.defaultavatar1 + '" class="recent-avatar">';
                    threadCode = threadCode.replace(/\[A\]/ig,T_Av);
                } if(getThreads[g].length > 7) {
                    var T_Time = '<span class="date"><abbr class="time recent_time" data-timestamp="' + getThreads[g][7] + '"></abbr></span>';
                    threadCode = threadCode.replace(/\[W\]/ig,T_Time);
                } else {
                    threadCode = threadCode.replace(/\[W\]/ig,'N/A');
                }
                
                threadCode = threadCode.replace(/\[B\]/ig,B_Title);
                threadCode = threadCode.replace(/\[T\]/ig,T_Title);
                threadCode = threadCode.replace(/\[P\]/ig,T_Peep);
                
                div.innerHTML = threadCode;
            } else {
                if (pb.plugin.get('recently_updated_threads').settings.display_option === 'tnu') {
                    div.title = getThreads[g][1];
                    var a = document.createElement('a');
                    a.className = 'recent-threads-title';
                    with(a) { href=getThreads[g][0]; innerHTML = getThreads[g][5]; }
                    div.appendChild(a);
                    div.innerHTML += ' by ';
                    var peep = document.createElement('a');
                    with(peep) { href='/user/' + getThreads[g][3]; innerHTML=getThreads[g][2]; className='user-link user-' + getThreads[g][3] + ' group-' + getThreads[g][4]; }
                    div.appendChild(peep);
                } else if (pb.plugin.get('recently_updated_threads').settings.display_option === 'to') {
                    var a = document.createElement('a');
                    a.className = 'recent-threads-title';
                    with(a) { href=getThreads[g][0]; innerHTML=getThreads[g][5]; }
                    div.appendChild(a);
                    div.title = getThreads[g][1]+' by '+getThreads[g][2];
                } else if (pb.plugin.get('recently_updated_threads').settings.display_option === 'tub') {
                    var a = document.createElement('a');
                    a.className = 'recent-threads-title';
                    with(a) { href=getThreads[g][0]; innerHTML=getThreads[g][5]; }
                    div.appendChild(a);
                    div.innerHTML += ' by ';
                    var peep = document.createElement('a');
                    with(peep) { href='/user/' + getThreads[g][3]; innerHTML=getThreads[g][2]; className='user-link user-' + getThreads[g][3] + ' group-' + getThreads[g][4]; }
                    div.appendChild(peep);
                    div.innerHTML += ' in ' + getThreads[g][1];
                } else {
                    var a = document.createElement('a');
                    a.className = 'recent-threads-title';
                    with(a) { href=getThreads[g][0]; innerHTML=getThreads[g][5]; }
                    div.appendChild(a);
                    div.innerHTML += ' in ' + getThreads[g][1];
                }
            }
            
            if (pb.plugin.get('recently_updated_threads').settings.insite_forwarding === 'y') {
                var dCode = $(div).html();
                dCode = dCode.replace(/href="\/user/,'href="/forum/user');
                $(div).html(dCode);
            }
            
            $('#recent-threads-cell').append(div);
        }
    }
    
    var isStaff = proboards.data('user').is_staff;
    
    if (isStaff === 1) {
        var manA = $('<a></a>').attr('href','javascript:manage_threads()').html('<img src="' + pb.plugin.get('recently_updated_threads').images.cog + '" alt="Manage Threads">');
        var manCog = $('<span></span>').append(manA).css({'position' : 'absolute', 'right' : '0', 'top' : '3px'});
        if (pb.plugin.get('recently_updated_threads').settings.title_bar_id !== '') {
            var titleBar = $('#' + pb.plugin.get('recently_updated_threads').settings.title_bar_id).css('position','relative');
            manCog.appendTo(titleBar);
        } else {
            $('#recent-threads-cell').css('position','relative').append(manCog);
        }
    }
    
    return;
}
    
function manage_threads() {
    var ctd = pb.plugin.key('updated_threads').get();
    var ctdDiv = $('<div></div>').attr('id','ctd');
    
    for (cd = ctd.length - 1; cd > 0; cd--) {
        var newCTD = ctd[cd].split('|');
        var tDiv = $('<div></div>').attr({'id' : ctd[cd], 'class' : 'rtpopdiv'}).html('<span class="rtpoplink">' + newCTD[5] + '</span> by ' + newCTD[2] + ' in ' + newCTD[1]).mouseover(function() {
            $(this).attr('class','rtpopdivhover')
        }).mouseout(function() {
            $(this).attr('class','rtpopdiv')
        }).click(function() {
            $(this).remove()
        });

        $(ctdDiv).append(tDiv);
    }

    pb.window.alert('Click on the threads you wish to remove',ctdDiv,{ width: '600px', id: 'rtpop' });

    $('#ctd').parent().parent().find($('.ui-button-text')).html('Reset Key');
    $('#ctd').parent().parent().find($('.ui-dialog-buttonset>button')).click(function() {
        var newRTD = new Array();
        newRTD[0] = ctd[0];
        var popDiv = $(ctdDiv).find($('div'));

        for (pd = popDiv.length - 1; pd > -1; pd--) {
            newRTD.push($(popDiv[pd]).attr('id'));
        }

        pb.plugin.key('updated_threads').set({
            value: newRTD,
            success: function() {
                location.reload();
            },
            fail: function(error) {
                // error.code will contain an error code id:
                // 1 = value is too big
                // 2 = server did not respond / general error
                // 3 = this user does not have permission to change this key
                // 4 = Invalid data received by the server
                // error.reason will contain a friendly response from the server corresponding to the error code
            }
        });
    });

    return;
}

function set_new_thread_key() {
    var bID = pb.data('route').params.board_id.toString();
    var nnn = $.inArray(bID,pb.plugin.get('recently_updated_threads').settings.restricted_boards);

    if ($.inArray(bID,pb.plugin.get('recently_updated_threads').settings.restricted_boards) > -1) {
        if (pb.plugin.key('updated_threads').get().length === undefined) {
            return;
        }

        var daKey = pb.plugin.key('updated_threads').get();
        daKey[0]++;
        pb.plugin.key('updated_threads').set_on('thread_new', daKey);

        return;
    }
    
    if (pb.plugin.key('updated_threads').get().length === undefined) {
        var threadURL = '/thread/1/';
        var keyData = new Array('1');
    } else {
        var keyData = pb.plugin.key('updated_threads').get();
        var threadNum = parseInt(keyData[0]);
        threadNum++;
        var threadURL = '/threads/recent/'+threadNum+'/';
        keyData[0] = threadNum;
    }
    
    var boardName = pb.data('page').board.name;
    var posterName = pb.data('user').name;
    var posterID = pb.data('user').id;
    var posterAv = pb.data('user').avatar;
    posterAv = posterAv.split(/src=["|']/)[1].split(/["|']/)[0];
    var postTime = parseInt(new Date().getTime());

    if (typeof(proboards.data('user').group_ids) !== 'undefined') {
        var posterGroup = proboards.data('user').group_ids[0];
    } else {
        var posterGroup = 0;
    }
    
    $('.submit span input').mousedown(function() {
        var threadName = $('.subject_input input').val();
        
        var setData = threadURL + '|' + boardName + '|' + posterName + '|' + posterID + '|' + posterGroup + '|' + threadName + '|' + posterAv + '|' + postTime;
        var newKeyData = keyData.slice();
        
        newKeyData.push(setData);
        
        while (newKeyData.length > parseInt(pb.plugin.get('recently_updated_threads').settings.how_many_threads) + 1) {
            newKeyData.splice(1,1);
        }
        
        pb.plugin.key('updated_threads').set_on('thread_new', newKeyData);
    });
    
    return;
}


function set_thread_key(thread_list) {
    var bID = pb.data('page').thread.board_id.toString();
    var nnn = $.inArray(bID, pb.plugin.get('recently_updated_threads').settings.restricted_boards);

    if ($.inArray(bID, pb.plugin.get('recently_updated_threads').settings.restricted_boards) > -1) {
        return;
    }
    
    var threadURL = pb.data('page').thread.url;
    threadURL = threadURL.replace('/thread/','/threads/recent/');
    
    var boardName = pb.data('page').board.name;
    var posterName = pb.data('user').name;
    var posterID = pb.data('user').id;
    var posterAv = pb.data('user').avatar;
    var postTime = parseInt(new Date().getTime());
    
    posterAv = posterAv.split(/src=["|']/)[1].split(/["|']/)[0];

    if (typeof(proboards.data('user').group_ids) !== 'undefined') {
        var posterGroup = pb.data('user').group_ids[0];
    } else {
        var posterGroup = 0;
    }

    var threadName = pb.data('page').thread.subject;
    
    var setData = threadURL + '|' + boardName + '|' + posterName + '|' + posterID + '|' + posterGroup + '|' + threadName + '|' + posterAv + '|' + postTime;
    
    if (pb.plugin.key('updated_threads').get().length === undefined) {
        var keyData = new Array(0,setData);

        if (document.location.href.match(/\/thread\/\d/)) {
            pb.plugin.key('updated_threads').set_on('post_quick_reply', keyData);
        } else {
            pb.plugin.key('updated_threads').set_on('post_new', keyData);
        }
    } else {
        var keyData = pb.plugin.key('updated_threads').get();
        
        for (k = keyData.length - 1; k > 0; k--) {
            var testData = keyData[k].slice();
            if (testData.length > 6 && testData.match(/\|/)) {
                testData = testData.split('|');
            }
            if (!thread_list.match(/posts/) && threadURL.match(testData[0])) {
                keyData.splice(k,1);
            }
        }

        keyData.push(setData);
        
        var listLength = parseInt(pb.plugin.get('recently_updated_threads').settings.how_many_threads);

        if (listLength < 1) {
            listLength = 1;
        } else if(listLength > 100) {
            listLength = 100;
        }
        
        while (keyData.length > listLength + 1) {
            keyData.splice(1,1);
        }
        
        if (document.location.href.match(/\/thread\/\d/)) {
            pb.plugin.key('updated_threads').set_on('post_quick_reply', keyData);
        } else {
            pb.plugin.key('updated_threads').set_on('post_new', keyData);
        }
    }
    
    if (pb.plugin.get('recently_updated_threads').settings.bump_threads === 'bump') {
        $('.modFunctions .bump').click(function() {
            pb.plugin.key('updated_threads').set({
                value: keyData,
                success: function() {
                    $('#recent-threads-cell').html('');
                    set_RT();
                },
                fail: function(error) {
                    // error.code will contain an error code id:
                    // 1 = value is too big
                    // 2 = server did not respond / general error
                    // 3 = this user does not have permission to change this key
                    // 4 = Invalid data received by the server
                    // error.reason will contain a friendly response from the server corresponding to the error code
                }
            });
        });
    }
    
    return;
}

function check_new_thread_id() {
    var newKeyData = pb.plugin.key('updated_threads').get().slice();
    var threadID = pb.data('route').params.thread_id;
    var threadSub = pb.data('page').thread.subject;
    var lastThreadSub = newKeyData[newKeyData.length-1].split('|')[5];
    
    if (parseInt(newKeyData[0]) === parseInt(threadID) && threadSub === lastThreadSub) {
        return;
    } else if (parseInt(newKeyData[0]) !== parseInt(threadID) && threadSub === lastThreadSub) {
        newKeyData[0] = threadID;
        newKeyData[newKeyData.length-1] = newKeyData[newKeyData.length-1].replace(/threads\/recent\/\d+/, 'threads/recent/' + threadID);
        newKeyData[newKeyData.length-1] = newKeyData[newKeyData.length-1].replace(/thread\/\d+/, 'thread/' + threadID);
        
        proboards.alert("There's a problem", "The current thread numbers do not match.<br>Please click 'OK' to reset them.", { width: 300 });

        $('.ui-dialog').click(function() {
            pb.plugin.key('updated_threads').set({ value: newKeyData });
        });
    }
    
    return;
}

function move_sidebar() {
    $('#RT-Master').appendTo('#' + pb.plugin.get('recently_updated_threads').settings.container_id);
    return;
}

$(document).ready(function() {
    $('body').prepend($('#RT-parent'));
     
    var curPage = proboards.data('route').name;
    var thread_list = pb.plugin.get('recently_updated_threads').settings.thread_list;

    if (curPage === 'home') {
        set_RT();
    } else if (pb.plugin.get('recently_updated_threads').settings.ancillary_pages === 'y' && curPage.match(/(forum|user|conv|member|search|subscri|cale|recent|page|bookmark|login|register)/)) {
        set_RT();
    }
        
    if (pb.plugin.get('recently_updated_threads').settings.container_id !== '') {
        move_sidebar();
    }
       
    if ((proboards.data('route').name.match(/(new|quote)_post/) || document.location.href.match(/\/thread\/\d/)) && (thread_list.match(/(updated|posts)/))) {
        set_thread_key(thread_list);
    }
        
    if (proboards.data('route').name === 'new_thread') {
        set_new_thread_key();
    }
});