var devblocksend = false;
var locationtest = false;
var accountinfo;
var profilechanged = false;
var focusid;
var focusname;
var tablink;
var submitcheck = true;
var buildhistory = [];
var marriagedates = [];
var loggedin = false;
var updatecount = 1;
var updatetotal = 0;
chrome.storage.local.get('buildhistory', function (result) {
    if(exists(result.buildhistory)) {
        buildhistory = result.buildhistory;
        buildHistoryBox();
    }
});

function buildHistoryBox() {
    var historytext = "";
    for (var i=0; i < buildhistory.length; i++) {
        var name = buildhistory[i].id;
        if (exists(buildhistory[i].name)) {
            name = buildhistory[i].name;
        }
        var datetxt = "";
        if (exists(buildhistory[i].date)) {
            datetxt = moment(buildhistory[i].date).format("MM-DD@HH:mm") + ': ';
        }
        historytext += '<li>' + datetxt + '<a href="http://www.geni.com/' + buildhistory[i].id + '" target="_blank">' + name + '</a></li>';
    }
    historytext += "";
    document.getElementById("historybox").innerHTML = historytext;
}

function buildHistorySelect() {
    var historytext = "";
    for (var i=0; i < buildhistory.length; i++) {
        var name = buildhistory[i].id;
        if (exists(buildhistory[i].name)) {
            name = buildhistory[i].name;
        }
        historytext += '<option value="' + buildhistory[i].id + '">History: ' + name +  '</option>';
    }
    return historytext;
}

var dateformatter = ["MMM YYYY", "MMM D YYYY", "YYYY", "MM/ /YYYY"];
//noinspection JSUnusedGlobalSymbols
var expandparent = true; //used in expandAll function window[...] var call
//noinspection JSUnusedGlobalSymbols
var expandpartner = true; //same
//noinspection JSUnusedGlobalSymbols
var expandsibling = true; //same
//noinspection JSUnusedGlobalSymbols
var expandchild = true; //samet

// Run script as soon as the document's DOM is ready.
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        if (typeof str === "undefined") {
            return false;
        }
        return this.slice(0, str.length) == str;
    }
}
if (typeof String.prototype.endsWith != 'function' ) {
    String.prototype.endsWith = function( str ) {
        if (typeof str === "undefined") {
            return false;
        }
        return this.substring( this.length - str.length, this.length ) === str;
    }
}
if (!String.prototype.contains) {
    String.prototype.contains = function () {
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log(chrome.app.getDetails().name + " v" + chrome.app.getDetails().version);
    loadLogin();
    checkAccount();
    chrome.tabs.getSelected(null, function (tab) {
        tablink = tab.url;
        if (startsWithMH(tablink,"research/collection")) {
            getPageCode();
        } else if (startsWithMH(tablink,"matchingresult")) {
            document.querySelector('#loginspinner').style.display = "none";
            setMessage("#f8ff86", 'SmartCopy Disabled: Please select one of the Matches on this results page.');
        } else if (tablink.startsWith("http://www.geni.com/people/") || tablink.startsWith("http://www.geni.com/family-tree/")) {
            var focusprofile = getProfile(tablink);
            focusid = focusprofile.replace("?profile=", "");
            updateLinks(focusprofile);
            userAccess();
        } else {
            setMessage("#f9acac", 'SmartCopy Disabled: The MyHeritage Smart/Record Match page is not detected.');
            document.querySelector('#loginspinner').style.display = "none";
        }
    });
});

function userAccess() {
    if (loggedin && exists(accountinfo)) {
        if(accountinfo.curator) {
            chrome.extension.sendMessage({
                method: "GET",
                action: "xhttp",
                url: "http://historylink.herokuapp.com/account?profile=" + focusid,
                variable: ""
            }, function (response) {
                document.querySelector('#loginspinner').style.display = "none";
                var responsedata = JSON.parse(response.source);
                var accessdialog = document.querySelector('#useraccess');
                if (!responsedata.big_tree) {
                    accessdialog.style.display = "block";
                    accessdialog.style.marginBottom = "-2px";
                    accessdialog.style.backgroundColor = "#AFC8FF";
                    accessdialog.innerHTML = "This profile is not in the big tree.";
                    setMessage("#f9acac", 'SmartCopy Disabled: The MyHeritage Smart/Record Match page is not detected.');
                }
                else if (responsedata.claimed && !responsedata.curator) {
                    if (responsedata.pro) {
                        if (!responsedata.user) {
                            accessdialog.style.display = "block";
                            accessdialog.innerHTML = '<div style="padding-top: 2px;"><strong>This Pro user has limited rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="grantbutton" class="cta cta-blue">Grant Tree-Building</button></div>' +
                                '<div>Granting tree-building rights will give this user the ability to add profiles to the Geni tree via SmartCopy.  If you notice they are not being responsible with the tool, you can revoke the rights.</div>';
                            document.getElementById('grantbutton').addEventListener('click', useradd, false);
                        } else {
                            accessdialog.style.display = "block";
                            if (responsedata.user.revoked == null) {
                                accessdialog.innerHTML = '<div style="padding-top: 2px;"><strong>This Pro user has tree-building rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="revokebutton" class="cta cta-red">Revoke Tree-Building</button></div>' +
                                    '<div>Tree-building rights were granted by <a href="http://www.geni.com/' + responsedata.user.sponsor + '" target="_blank">' + responsedata.user.sname + '</a> on ' + responsedata.user.sponsordate + ' UTC</div>';
                                document.getElementById('revokebutton').addEventListener('click', userrevoke, false);
                            } else {
                                accessdialog.innerHTML = '<div style="padding-top: 2px;"><strong>This Pro user has limited rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="grantbutton" class="cta cta-yellow">Restore Tree-Building</button></div>' +
                                    '<div>Tree-building rights were revoked by <a href="http://www.geni.com/' + responsedata.user.revoked + '" target="_blank">' + responsedata.user.rname + '</a> on ' + responsedata.user.revokedate + ' UTC</div>';
                                document.getElementById('grantbutton').addEventListener('click', userrestore, false);
                            }
                        }
                    } else {
                        accessdialog.style.display = "block";
                        accessdialog.innerHTML = '<div style="padding-top: 2px;"><strong>This basic user has limited access to SmartCopy.</strong></div>' +
                            '<div>Non-Pro Geni users have the ability to update the focus profile but can not add family members.</div>';
                    }
                } else {
                    accessdialog.style.display = "block";
                    accessdialog.style.marginBottom = "-2px";
                    accessdialog.innerHTML = "<div style='font-size: 115%;'><strong>Research this Person</strong></div>Loading...";
                    setMessage("#f9acac", 'SmartCopy Disabled: The MyHeritage Smart/Record Match page is not detected.');
                    buildResearch();
                }
            });
        } else {
            setMessage("#f9acac", 'SmartCopy Disabled: The MyHeritage Smart/Record Match page is not detected.');
        }
    } else {
        setTimeout(userAccess, 200);
    }
}

function userrestore() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = "http://historylink.herokuapp.com/account?profile=" + focusid;
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=add_user",
        variable: ""
    }, function (response) {
        window.close();
    });
}

function useradd() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = "http://historylink.herokuapp.com/account?profile=" + focusid;
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=add_user",
        variable: ""
    }, function (response) {
    });
    chrome.tabs.getSelected(null, function(tab){
        chrome.tabs.update(tab.id, {url: "http://www.geni.com/threads/new/" + focusid.replace("profile-g", "") + "?return_here=true"}, function() {
            chrome.tabs.executeScript(null, {
                code: "document.getElementById('thread_subject').value='SmartCopy Invite';" +
                    "document.getElementById('msg_body').value='I have granted you tree-building rights with SmartCopy, " +
                    "which is a Google Chrome extension that allows you to copy data from MyHeritage Record and Smart Matches into the Geni tree.\\n\\n" +
                    "The extension can be downloaded here: http://historylink.herokuapp.com/smartcopy\\n" +
                    "More information and discussion can be found in the Geni project: http://www.geni.com/projects/SmartCopy/18783\\n\\n" +
                    "Before using SmartCopy, please read the cautionary notes and feedback request in the Project Description.\\n\\n" +
                    "SmartCopy can be a powerful tool to help us build the world tree, but it could also quickly create duplication and introduce bad data. " +
                    "Users granted rights to SmartCopy are expected to be responsible with using this tool, attempt to merge any duplicates that arise, and work through relationship conflicts (get curator assistance if necessary)." +
                    "';"
            }, function() {
                window.close();
            })
        });
    });
}

function userrevoke() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = "http://historylink.herokuapp.com/account?profile=" + focusid;
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=revoke_user",
        variable: ""
    }, function (response) {
        window.close();
    });
}

function startsWithMH(stringToCheck, query) {
    var searchPattern = new RegExp('^https?://www\.myheritage\..*?/' + query, 'i');
    return searchPattern.test(stringToCheck);
}

function updateLinks(focusprofile) {
    $("#historyurl").attr("href", "http://historylink.herokuapp.com/history" + focusprofile);
    $("#graphurl").attr("href", "http://historylink.herokuapp.com/graph" + focusprofile + "&color=gender");
    $("#descendanturl").attr("href", "http://historylink.herokuapp.com/graph" + focusprofile + "&type=descendant&color=gender");
}

chrome.extension.onMessage.addListener(function (request, sender, callback) {
    if (request.action == "getSource") {
        loadPage(request);
    }
});

function loadPage(request) {
    /*
     Below checks to make sure the user has not clicked away from the matched profile
     in order to prevent them from copying a family or data to the wrong destination.
     Once you click off the initial match, MH adds a row of tabs - using that as indication.
     */
    if (request.source.indexOf('SearchPlansPageManager') !== -1) {
        document.getElementById("smartcopy-container").style.display = "none";
        document.getElementById("loading").style.display = "none";
        setMessage("#f8ff86", 'SmartCopy can work with the various language sites of MyHeritage, but you must have an authenticated session with the English website.<br/><a href="http://www.myheritage.com/">Please login to MyHeritage.com</a>');
    }
    else if (request.source.indexOf('pk_family_tabs') === -1 || profilechanged) {
        if (supportedCollection()) {
            document.getElementById("top-container").style.display = "block";
            var parsed = $('<div>').html(request.source.replace(/<img[^>]*>/g,""));
            focusname= parsed.find(".recordTitle").text().trim();
            var focusrange = parsed.find(".recordSubtitle").text().trim();
            if (!profilechanged) {
                var focusprofile = parsed.find(".individualInformationProfileLink").attr("href").trim();
                focusid = focusprofile.replace("http://www.geni.com/", "");
                updateLinks("?profile=" + focusid);
            }
            document.getElementById("focusname").innerText = focusname;
            if (focusrange !== "") {
                document.getElementById("focusrange").innerText = focusrange;
            }
            console.log("Parsing Family...");
            parseSmartMatch(request.source, (accountinfo.pro && accountinfo.user));

            if (!accountinfo.pro) {
                document.getElementById("loading").style.display = "none";
                $("#familymembers").attr('disabled', 'disabled');
                setMessage("#f8ff86", 'The copying of Family Members is only available to Geni Pro Members.');
            } else if (!accountinfo.user) {
                document.getElementById("loading").style.display = "none";
                $("#familymembers").attr('disabled', 'disabled');
                setMessage("#f8ff86", 'Copying Family Members has been restricted to trusted Geni users.  You may request this ability from a Curator.');
            }
        } else {
            document.getElementById("top-container").style.display = "block";
            document.getElementById("submitbutton").style.display = "none";
            document.getElementById("loading").style.display = "none";
            setMessage("#f8ff86", 'This MyHeritage collection is not fully supported by SmartCopy. You could try enabling experimental collection parsing under options.');
        }
    } else {
        var itemId = getParameterByName('itemId', tablink);
        for (var i=0;i< buildhistory.length;i++) {
            if(buildhistory[i].itemId === itemId) {
                focusid = buildhistory[i].id;
                profilechanged = true;
                loadPage(request);
                return;
            }
        }

        document.getElementById("smartcopy-container").style.display = "none";
        document.getElementById("loading").style.display = "none";
        setMessage("#f8ff86", 'SmartCopy was unable to determine the matching Geni profile to use as a copy destination.<br/>' +
            '<strong><span id="changetext">Set Geni Destination Profile</span></strong>' +
            '<table style="width: 100%;"><tr class="optionrow" style="display: none;">' +
            '<td id="focusoption" style="width: 100%; text-align: left;"></td></tr>' +
            '<tr class="optionrow" style="display: none;"><td colspan="2">Or enter URL:</td></tr>' +
            '<tr><td style="padding-right: 5px;">' +
            '<input type="text" style="width: 100%;" id="changeprofile"></td>' +
            '</tr><tr><td style="padding-top: 5px;"><button id="changefocus">Update Destination</button></td></tr></table>');

        var parsed = $('<div>').html(request.source.replace(/<img[^>]*>/g,""));
        var focusperson = parsed.find(".individualInformationName").text().trim();
        var focusprofile = parsed.find(".individualInformationProfileLink").attr("href");
        if (exists(focusprofile)) {
            focusprofile = focusprofile.replace("http://www.geni.com/", "").trim();
            var url = "http://historylink.herokuapp.com/smartsubmit?family=all&profile=" + focusprofile;
            chrome.extension.sendMessage({
                method: "GET",
                action: "xhttp",
                url: url
            }, function (response) {
                var result = JSON.parse(response.source);
                result.sort(function (a, b) {
                    var relA = a.relation.toLowerCase(), relB = b.relation.toLowerCase();
                    if (relA < relB) //sort string ascending
                        return -1;
                    if (relA > relB)
                        return 1;
                    return 0; //default return value (no sorting)
                });
                var selectsrt = '<select id="focusselect" style="width: 100%;"><option>Select relative of ' + focusperson + '</option>';
                if (exists(result)) {
                    for (var key in result) if (result.hasOwnProperty(key)) {
                        var person = result[key];
                        if (exists(person.name)) {
                            selectsrt += '<option value="' + person.id + '">' + capFL(person.relation) + ": " + person.name +  '</option>';
                        }
                    }
                    if (buildhistory.length > 0) {
                        selectsrt += '<option disabled>&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;</option>';
                    }
                }
                selectsrt += buildHistorySelect();
                selectsrt += '</select>';
                $('.optionrow').css("display", "table-row");
                $('#focusoption')[0].innerHTML = selectsrt;
            });
        } else {
            var selectsrt = '<select id="focusselect" style="width: 100%;"><option>Select from History</option>';
            selectsrt += buildHistorySelect();
            selectsrt += '</select>';
            $('.optionrow').css("display", "table-row");
            $('#focusoption')[0].innerHTML = selectsrt;
        }
        $(function () {
            $('#changefocus').on('click', function () {
                var profilelink = getProfile($('#changeprofile')[0].value);
                if (profilelink === "") {
                    var focusselect = $('#focusselect')[0];
                    if (exists(focusselect)) {
                        profilelink = "?profile=" + focusselect.options[focusselect.selectedIndex].value;
                    }
                }
                if (profilelink !== "" || devblocksend) {
                    updateLinks(profilelink);
                    focusid = profilelink.replace("?profile=", "");
                    document.querySelector('#message').style.display = "none";
                    document.getElementById("smartcopy-container").style.display = "block";
                    document.getElementById("loading").style.display = "block";
                    profilechanged = true;
                    loadPage(request);
                } else {
                    var invalidtext = $("#changetext")[0];
                    invalidtext.innerText = "Invalid Profile Id - Try Again";
                    invalidtext.style.color ='red';
                }
            });
        });
    }
}

function setMessage(color, messagetext) {
    var message = document.querySelector('#message');
    message.style.backgroundColor = color;
    message.style.display = "block";
    message.innerHTML = messagetext;
}

function getPageCode() {
    if (loggedin && exists(accountinfo)) {
        document.querySelector('#loginspinner').style.display = "none";
        document.getElementById("smartcopy-container").style.display = "block";
        document.getElementById("loading").style.display = "block";
        if (tablink.startsWith("http://www.myheritage.com/")) {
            chrome.tabs.executeScript(null, {
                file: "getPagesSource.js"
            }, function () {
                // If you try and inject into an extensions page or the webstore/NTP you'll get an error
                if (chrome.extension.lastError) {
                    message.innerText = 'There was an error injecting script : \n' + chrome.extension.lastError.message;
                }
            });
        } else {
            var url = tablink.replace(/https?:\/\/www\.myheritage\..*?\//i,"http://www.myheritage.com/") + "&lang=EN";
            chrome.extension.sendMessage({
                method: "GET",
                action: "xhttp",
                url: url
            }, function (response) {
                loadPage(response);
            });
        }
    } else {
        setTimeout(getPageCode, 200);
    }
}

function checkAccount() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://historylink.herokuapp.com/account?version=" + chrome.app.getDetails().version, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var response = JSON.parse(xhr.responseText);
            if (response.curator) {
                //display leaderboard link if user is a curator - page itself still verifies
                document.getElementById("curator").style.display = "inline-block";
            }
            accountinfo = response;
        }
    };
    xhr.send();
}

function loadLogin() {
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: "http://historylink.herokuapp.com/smartlogin"
    }, function (responseText) {
        if (responseText.source === "<script>window.open('', '_self', ''); window.close();</script>") {
            console.log("Logged In...");
            loggedin = true;
        } else {
            console.log("Logged Out...");
            var w = 600;
            var h = 450;
            var left = Math.round((screen.width / 2) - (w / 2));
            var top = Math.round((screen.height / 2) - (h / 2));
            //redirect helps it close the window properly.. not sure why
            chrome.windows.create({'url': 'redirect.html', 'type': 'panel', 'width': w, 'height': h, 'left': left, 'top': top, 'focused': true}, function (window) {
                //grab the window.id if needed
            });
        }
    });
}

function getProfile(profile_id) {
    //Gets the profile id from the Geni URL
    if (profile_id.length > 0) {
        if (profile_id.indexOf("&resolve=") != -1) {
            profile_id = profile_id.substring(profile_id.lastIndexOf('#') + 1);
        }
        if (profile_id.indexOf("profile-") != -1) {
            profile_id = profile_id.substring(profile_id.lastIndexOf('/') + 1);
        }
        if (profile_id.indexOf("#/tab") != -1) {
            profile_id = profile_id.substring(0, profile_id.lastIndexOf('#/tab'));
        }
        if (profile_id.indexOf("/") != -1) {
            //Grab the GUID from a URL
            profile_id = "profile-g" + profile_id.substring(profile_id.lastIndexOf('/') + 1);
        }
        if (profile_id.indexOf("?") != -1) {
            //In case the copy the profile url by navigating through another 6000000002107278790?through=6000000010985379345
            profile_id = profile_id.substring(0, profile_id.lastIndexOf('?'));
        }
        if (profile_id.indexOf("#") != -1) {
            //In case the copy the profile url by navigating in tree view 6000000001495436722#6000000010985379345
            profile_id = "profile-g" + profile_id.substring(profile_id.lastIndexOf('#') + 1, profile_id.length);
        }
        var isnum = /^\d+$/.test(profile_id);
        if (isnum) {
            profile_id = "profile-g" + profile_id;
        }
        if (profile_id.indexOf("profile-") != -1) {
            return "?profile=" + profile_id;
        }
    }
    return "";
}

var exlinks = document.getElementsByClassName("expandlinks");

var expandAll = function() {
    var expandmembers = $(this).closest('div').find('.memberexpand');
    for(var i=0;i<expandmembers.length;i++){
        if (window[this.name]) {
            $(expandmembers[i]).slideDown();
            this.innerText = "collapse all";
        } else {
            $(expandmembers[i]).slideUp();
            this.innerText = "expand all";
        }
    }
    window[this.name] = !window[this.name];
};

for(var i=0;i<exlinks.length;i++){
    exlinks[i].addEventListener('click', expandAll, false);
}

function expandFamily(member) {
    $('#slide'+member).slideToggle();
}

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

function capFL(string)
{   //Capitalize the first letter of the string
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function exists(object) {
    return (typeof object !== "undefined" && object !== null);
}

$(function () {
    $('.checkall').on('click', function () {
        var fs = $(this).closest('div').find('fieldset');
        fs.find(':checkbox').prop('checked', this.checked);
        var ffs = fs.find('input:text,select,input:hidden,textarea');
        ffs.filter(function(item) {
            return (ffs[item].type !== "checkbox");
        }).attr('disabled', !this.checked);
    });
});

$(function () {
    $('#updateslide').on('click', function() {
        $('#profilefield').slideToggle();
    });
});

$(function () {
    $('#showhistory').on('click', function () {
        $('#historybox').slideToggle();
    });
});

// Form submission
var submitstatus = [];
var tempspouse = [];
var spouselist = [];
var parentlist = [];
var addchildren = [];
var photosubmit = [];
var focusphotoinfo = null;
var submitform = function() {
    if (parsecomplete && submitcheck) {
        document.getElementById("bottomsubmit").style.display = "none";
        document.getElementById("submitbutton").style.display = "none";
        submitcheck = false; //try to prevent clicking more than once and submitting it twice
        document.getElementById("familydata").style.display = "none";
        document.getElementById("profiledata").style.display = "none";
        document.getElementById("updating").style.display = "block";
        setMessage("#f8ff86", 'Leaving this window before completion could result in an incomplete data copy.');

        var about = "";
        var sourcecheck = $('#sourceonoffswitch').prop('checked');
        var fs = $('#profiletable');
        var profileout = parseForm(fs);
        var profileupdatestatus = "";
        // --------------------- Update Profile Data ---------------------
        if (!$.isEmptyObject(profileout)) {
            document.getElementById("updatestatus").innerText = "Update: " + focusname;
            if (exists(profileout["about_me"])) {
                about = profileout["about_me"];
                if (!about.endsWith("\n")) {
                    about += "\n";
                }
            }
            if (sourcecheck) {
                if (!focusabout.contains("Updated from [" +  tablink + " MyHeritage Match] by [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]:")) {
                    if (focusabout !== "") {
                        about = focusabout + "\n" + about;
                    }
                    profileout["about_me"] = about + "* Updated from [" +  tablink + " MyHeritage Match] by [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]: ''" + moment.utc().format("MMM D YYYY, H:mm:ss") + " UTC''\n";
                } else {
                    if (about !== "") {
                        profileout["about_me"] = focusabout + "\n" + about;
                    }
                }
            } else if (about !== "" && focusabout !== "") {
                profileout["about_me"] = focusabout + "\n" + about;
            }
            if (exists(profileout.photo)) {
                var shorturl = tablink.substring(0, tablink.indexOf('showRecord') + 10);
                focusphotoinfo = {photo: profileout.photo, title: focusname, description: "Source: " + shorturl};
                delete profileout.photo;
            }
            buildTree(profileout, "update", focusid);
            document.getElementById("updatestatus").innerText = "Updating Profile";
            profileupdatestatus = "Updating Profile & ";
        }

        // --------------------- Add Family Data ---------------------
        var privateprofiles = $('.checkslide');
        for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
            var entry = privateprofiles[profile];
            if (exists(entry.name) && entry.name.startsWith("checkbox") && entry.checked) {
                fs = $("#" + entry.name.replace("checkbox", "slide"));
                var actionname = entry.name.split("-"); //get the relationship
                var familyout = parseForm(fs);
                var tempfamilyout = jQuery.extend(true, {}, familyout);
                delete tempfamilyout.profile_id;  //check to see if it's only the hidden profile_id
                if(!$.isEmptyObject(tempfamilyout)) {
                    var fdata = databyid[familyout.profile_id];
                    if (exists(fdata)) {
                        about = "";
                        if (exists(familyout["about_me"])) {
                            about = familyout["about_me"];
                        }
                        if (sourcecheck) {
                            about = about + "* Updated from [" +  fdata.url + " MyHeritage Match] via " + reverseRelationship(fdata.status) + " [http://www.geni.com/" + focusid + " " + focusname.replace(/"/g, "'") + "] by [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]: ''" + moment.utc().format("MMM D YYYY, H:mm:ss") + " UTC''\n";
                        }
                        if (about !== "") {
                            familyout["about_me"] = about;
                        }
                    }
                    if (exists(familyout.photo)) {
                        var shorturl = fdata.url.substring(0, fdata.url.indexOf('showRecord') + 10);
                        photosubmit[familyout.profile_id] = {photo: familyout.photo, title: fdata.name, description: "Source: " + shorturl};
                        delete familyout.photo;
                    }
                    if (actionname[1] !== "child") {
                        var statusaction = actionname[1];
                        if (statusaction === "sibling" || statusaction === "parent" || statusaction === "partner") {
                            statusaction += "s";
                        }
                        document.getElementById("updatestatus").innerText = profileupdatestatus + "Adding Family (Siblings/Parents)";
                        buildTree(familyout, "add-" + actionname[1], focusid);
                    } else {
                        addchildren[familyout.profile_id] = familyout;
                    }
                }
            }
        }
    }

    submitChildren();
};

function buildTree(data, action, sendid) {
    if(!$.isEmptyObject(data) && !devblocksend) {
        if (action !== "add-photo" && action !== "delete") {
            updatetotal += 1;
            document.getElementById("updatetotal").innerText = updatetotal;
            document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
        }
        submitstatus.push(updatetotal);
        var id = "";
        if (exists(data.profile_id)) {
            id = data.profile_id;
            delete data.profile_id;
        }

        chrome.extension.sendMessage({
            method: "POST",
            action: "xhttp",
            url: "http://historylink.herokuapp.com/smartsubmit?profile=" + sendid + "&action=" + action,
            data: $.param(data),
            variable: {id: id, relation: action.replace("add-","")}
        }, function (response) {
            var result = JSON.parse(response.source);
            var id = response.variable.id;
            if (exists(databyid[id])) {
                if (exists(result.id)) {
                    databyid[id]["geni_id"] = result.id;
                }
                if (response.variable.relation === "partner") {
                    spouselist[id] = {union: result.unions[0].replace("https://www.geni.com/api/", ""), status: databyid[id].status};
                } else if (response.variable.relation === "parent") {
                    if (parentlist.length > 0) {
                        if (exists(parentlist[0].id) && (exists(marriagedates[id]) || exists(marriagedates[parentlist[0].id]))) {
                            if (exists(marriagedates[id])) {
                                var pid = id;
                            } else {
                                var pid = parentlist[0].id;
                            }
                            if (action !== "add-photo" && action !== "delete") {
                                updatetotal += 1;
                                document.getElementById("updatetotal").innerText = updatetotal;
                            }
                            submitstatus.push(updatetotal);
                            var source = JSON.parse(response.source);
                            var familyurl = "http://historylink.herokuapp.com/smartsubmit?family=spouse&profile=" + source.id;
                            chrome.extension.sendMessage({
                                method: "GET",
                                action: "xhttp",
                                variable: {id: pid},
                                url: familyurl
                            }, function (response) {
                                var source2 = JSON.parse(response.source);
                                var rid = response.variable.id;
                                if (exists(source2[0].union)) {
                                    spouselist[rid] = {union: source2[0].union, status: databyid[rid].mstatus};
                                }
                                if (action !== "add-photo" && action !== "delete") {
                                    updatecount += 1;
                                    document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
                                }
                                submitstatus.pop();
                            });
                        }
                    } else {
                        parentlist.push({id: id, status: databyid[id].mstatus});
                    }
                }
                addHistory(result.id, databyid[id].itemId, databyid[id].name);
            }
            if (action !== "add-photo" && action !== "delete") {
                updatecount += 1;
                document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
            }
            submitstatus.pop();
        });
    } else if (!$.isEmptyObject(data) && devblocksend) {
        if (exists(data.profile_id)) {
            var id = data.profile_id;
            if (exists(databyid[id])) {
                databyid[id]["geni_id"] = "profile-123456" + id.toString();
                console.log(action + " on " + databyid[id]["geni_id"]);
                spouselist[id] = {union: "union"+id, status: databyid[id].status};
                if (parentlist.length > 0) {
                    if (exists(marriagedates[id])) {
                        spouselist[id] = {union: "union"+id, status: databyid[id].mstatus};
                    } else if (exists(marriagedates[parentlist[0].id])) {
                        var pid = parentlist[0];
                        spouselist[pid.id] = {union: "union"+pid.id, status: pid.mstatus};
                    } else {
                        console.log("No Parent");
                    }
                    console.log("Add Union: " + JSON.stringify(spouselist[id]));
                } else {
                    parentlist.push({id: id, status: databyid[id].mstatus});
                }
            }
            delete data.profile_id;
        }
        console.log("-------------------");
        console.log(JSON.stringify(data));
    }
}

var checkchildren = false;
var checkpictures = false;
var photocount = 0;
var photototal = 0;
var photoprogress = 0;
function submitChildren() {
    if (submitstatus.length > 0) {
        setTimeout(submitChildren, 200);
    } else if (!checkchildren) {
        checkchildren = true;
        updatecount = 1;
        updatetotal = 0;
        if (spouselist.length > 0) {
            document.getElementById("updatestatus").innerText = "Adding Spouse(s)";
        }
        var tempadded = [];
        for(var i = 0; i < addchildren.length; i++) {
            if (exists(addchildren[i])) {
                var childid = childlist[i];
                if (!exists(childid) || childid === -1) {
                    childid = 0;
                } else if (childid.startsWith("union")) {
                    continue;
                }
                if (!exists(tempadded[childid]) && !exists(spouselist[childid])) {
                    //Add a temp for each spouse which is a parent that is not added
                    buildTempSpouse(childid);
                    tempadded[childid] = "added";
                }
            }
        }
        for (var i=0; i < spouselist.length; i++) {
            if (exists(spouselist[i])) {
                var spouseinfo = spouselist[i];
                var marriageupdate = {};
                var status = "";

                if (spouseinfo.status === "partner") {
                    status = "partner";
                } else if (spouseinfo.status === ("ex-partner")) {
                    status = "ex_partner";
                } else if (spouseinfo.status.startsWith("ex-")) {
                    status = "ex_spouse";
                }
                if (status !== "") {
                    marriageupdate.status = status;
                }
                if (exists(marriagedates[i])) {
                    marriageupdate.marriage = marriagedates[i].marriage;
                }
                if (!$.isEmptyObject(marriageupdate) && !devblocksend) {
                    chrome.extension.sendMessage({
                        method: "POST",
                        action: "xhttp",
                        url: "http://historylink.herokuapp.com/smartsubmit?profile=" + spouseinfo.union + "&action=update",
                        data: $.param(marriageupdate),
                        variable: ""
                    }, function (response) {
                    });
                    //Process the Union Update
                } else if (!$.isEmptyObject(marriageupdate) &&  devblocksend) {
                    console.log("Marriage Update: " + JSON.stringify(marriageupdate));
                }
            }
        }
        submitChildren();
    } else if (!checkpictures) {
        checkpictures = true;
        updatecount = 1;
        updatetotal = 0;
        if (addchildren.length > 0) {
            document.getElementById("updatestatus").innerText = "Adding Children";
        }
        // --------------------- Add Child Data ---------------------
        for (var child in addchildren) if (addchildren.hasOwnProperty(child)) {
            var familyout = addchildren[child];
            var clid = childlist[familyout.profile_id];
            var parentunion;
            if (!exists(clid) || clid === -1) {
                parentunion = spouselist[0].union;
            } else if (clid.startsWith("union")) {
                parentunion = clid;
            } else {
                parentunion = spouselist[clid].union;
            }
            if (exists(parentunion)) {
                buildTree(familyout, "add-child", parentunion);
            }
        }
        if (exists(focusphotoinfo) || photosubmit.length > 0) {
            if (exists(focusphotoinfo)) {
                photototal += 1;
            }
            for (var p=0;p < photosubmit.length; p++) {
                if (exists(photosubmit[p]) && exists(databyid[p])) {
                    photototal += 1;
                }
            }
            photoprogress = photototal;
        }
        submitChildren();
    } else if (exists(focusphotoinfo) || photoprogress > 0) {
        photocount += 1;
        var photodialog = "1 Photo";
        if (photototal > 1) {
            photodialog = photototal + " Photos";
        }
        document.getElementById("updatestatus").innerText = "Uploading " + photodialog;
        document.getElementById("updatetotal").innerText = photototal;
        document.getElementById("updatecount").innerText = Math.min(photocount, photototal).toString();
        if (exists(focusphotoinfo)) {
            buildTree(focusphotoinfo, "add-photo", focusid);
            focusphotoinfo = null;
            photoprogress -= 1;
        } else {
            for (var p=0;p < photosubmit.length; p++) {
                if (exists(photosubmit[p]) && exists(databyid[p])) {
                    buildTree(photosubmit[p], "add-photo", databyid[p].geni_id);
                    photosubmit[p] = null;
                    photoprogress -= 1;
                    break;
                }
            }
        }
        submitChildren();
    } else {
        submitWait();
    }
}

function buildTempSpouse(parentid) {
    var tgender = "unknown";
    if (focusgender === "male") {
        tgender = "female";
    } else if (focusgender === "female") {
        tgender = "male";
    }
    if (!devblocksend) {
        submitstatus.push(submitstatus.length);
        chrome.extension.sendMessage({
            method: "POST",
            action: "xhttp",
            url: "http://historylink.herokuapp.com/smartsubmit?profile=" + focusid + "&action=add-partner",
            data: $.param({gender: tgender}),
            variable: {id: parentid}
        }, function (response) {
            var result = JSON.parse(response.source);
            spouselist[response.variable.id] = {union: result.unions[0].replace("https://www.geni.com/api/", ""), status: "partner"};
            tempspouse[response.variable.id] = result.id;
            submitstatus.pop();
        });
    } else if (devblocksend) {
        //Dev testing code - give it some fake data so it doesn't fail
        spouselist[parentid] = {union: "union-58259268", status: "partner"};
    }
}

function submitWait() {
    if (submitstatus.length > 0) {
        setTimeout(submitWait, 200);
    } else {
        for (var i=0; i < tempspouse.length; i++) {
            if (exists(tempspouse[i])) {
                buildTree("", "delete", tempspouse[i]);
            }
        }
        document.getElementById("updating").innerHTML = '<div style="text-align: center; font-size: 110%;"><strong>Geni Tree Updated</strong></div>' +
            '<div style="text-align: center; padding:5px;"><b>View Profile:</b> ' +
            '<a href="http://www.geni.com/family-tree/index/' + focusid.replace("profile-g","") + '" target="_blank">tree view</a>, ' +
            '<a href="http://www.geni.com/' + focusid.replace("profile-g","") + '" target="_blank">profile view</a></div>';
        document.getElementById("message").style.display = "none";
        $('#updating').css('margin-bottom', "15px");
        buildHistoryBox();
        console.log("Tree Updated...");
        if (devblocksend) {
            console.log("******** Dev Mode - Blocked Sending ********")
        }
    }
}

var slideoptions = function() {
    $('#optionslide').slideToggle();
};

document.getElementById('submitbutton').addEventListener('click', submitform, false);
document.getElementById('submitbutton2').addEventListener('click', submitform, false);
document.getElementById('optionbutton').addEventListener('click', slideoptions, false);


function parseForm(fs) {
    var objentry = {};
    var marentry = {};
    var rawinput = fs.find('input:text,select,input:hidden,textarea');
    var fsinput = rawinput.filter(function(item) {
        return ($(rawinput[item]).closest('tr').css('display') !== 'none');
    });
    for (var item in fsinput) if (fsinput.hasOwnProperty(item)) {
        if (exists(fsinput[item].value) && !fsinput[item].disabled && fsinput[item].name !== "") {
            //console.log(fsinput[item].name + ":" + fsinput[item].value);
            var splitentry = fsinput[item].name.split(":");
            if (splitentry.length > 1) {
                if (splitentry[1] === "date") {
                    var updatefd = (fs.selector === "#profiletable");
                    var vardate = parseDate(fsinput[item].value, updatefd);

                    if (!$.isEmptyObject(vardate)) {
                        var finalentry = {};
                        finalentry[splitentry[1]] = vardate;
                        if (splitentry[0] !== "marriage") {
                            if (!exists(objentry[splitentry[0]])) {
                                objentry[splitentry[0]] = {};
                            }
                            $.extend(objentry[splitentry[0]], finalentry);
                        } else {
                            if (!exists(marentry[splitentry[0]])) {
                                marentry[splitentry[0]] = {};
                            }
                            $.extend(marentry[splitentry[0]], finalentry);
                        }
                    }
                } else if (splitentry[1] === "location" && splitentry.length > 2) {
                    if (fsinput[item].value !== "" || fs.selector === "#profiletable") {
                        var varlocation = {};
                        var fieldname = splitentry[2];
                        if (fieldname === "place_name_geo") {
                            fieldname = "place_name";
                        }
                        varlocation[fieldname] = fsinput[item].value;

                        if (splitentry[0] !== "marriage") {
                            if (!exists(objentry[splitentry[0]])) {
                                objentry[splitentry[0]] = {};
                            }
                            if (!exists(objentry[splitentry[0]][splitentry[1]])) {
                                objentry[splitentry[0]][splitentry[1]] = {};
                            }
                            $.extend(objentry[splitentry[0]][splitentry[1]], varlocation);
                        } else {
                            if (!exists(marentry[splitentry[0]])) {
                                marentry[splitentry[0]] = {};
                            }
                            if (!exists(marentry[splitentry[0]][splitentry[1]])) {
                                marentry[splitentry[0]][splitentry[1]] = {};
                            }
                            $.extend(marentry[splitentry[0]][splitentry[1]], varlocation);
                        }
                    }
                }
            } else {
                if (fsinput[item].name === "gender") {
                    if (exists(fsinput[item].options[fsinput[item].selectedIndex])) {
                        objentry[fsinput[item].name] = fsinput[item].options[fsinput[item].selectedIndex].value;
                    }
                } else if (fsinput[item].name === "parent") {
                    if (exists(fsinput[item].options[fsinput[item].selectedIndex])) {
                        childlist[objentry.profile_id] = fsinput[item].options[fsinput[item].selectedIndex].value;
                    }
                } else if (fsinput[item].value !== "") {
                    objentry[fsinput[item].name] = fsinput[item].value;
                }
            }
        }
        //var entry = focusprofile[profile];
        //console.log(entry);
    }
    if (!$.isEmptyObject(marentry)) {
        marriagedates[objentry.profile_id] = marentry;
    }
    return objentry;
}

function parseDate(fulldate, update) {
    var vardate = {};
    if (update) {
        vardate["circa"] = false;
        vardate["range"] = "";
        vardate["day"] = "";
        vardate["month"] = "";
        vardate["year"] = "";
        vardate["end_circa"] = "";
        vardate["end_day"] = "";
        vardate["end_month"] = "";
        vardate["end_year"] = "";
    }

    if (fulldate.startsWith("Circa")) {
        vardate["circa"] = true;
        fulldate = fulldate.replace("Circa ", "");
    }
    if (fulldate.startsWith("After")) {
        vardate["range"] = "after";
        fulldate = fulldate.replace("After ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
    } else if (fulldate.startsWith("Before")) {
        vardate["range"] = "before";
        fulldate = fulldate.replace("Before ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
    } else if (fulldate.startsWith("Between")) {
        vardate["range"] = "between";
        fulldate = fulldate.replace("Between ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
        var btsplit = fulldate.split(" and ");
        if (btsplit.length > 1) {
            fulldate = btsplit[0];
            if (btsplit[1].startsWith("Circa ")) {
                vardate["end_circa"] = true;
                btsplit[1] = btsplit[1].replace("Circa ", "").trim();
            }
            var dt = moment(btsplit[1].trim(), dateformatter);
            if (isNaN(btsplit[1])) {
                var splitd = btsplit[1].split(" ");
                if (splitd.length > 2) {
                    vardate["end_day"] = dt.get('date');
                    vardate["end_month"] = dt.get('month')+1; //+1 because, for some dumb reason, months are indexed to 0
                } else {
                    vardate["end_month"] = dt.get('month')+1; //+1 because, for some dumb reason, months are indexed to 0
                }
            }
            if (dt.get('year') !== 0) {
                vardate["end_year"] = dt.get('year');
            }
        }
    }
    var dt = moment(fulldate.trim(), dateformatter);
    //TODO Probably need to do some more checking below to make sure it doesn't improperly default dates
    if (isNaN(fulldate)) {
        var splitd = fulldate.split(" ");
        if (splitd.length > 2) {
            vardate["day"] = dt.get('date');
            vardate["month"] = dt.get('month')+1; //+1 because, for some dumb reason, months are indexed to 0
        } else {
            vardate["month"] = dt.get('month')+1; //+1 because, for some dumb reason, months are indexed to 0
        }
    }
    if (dt.get('year') !== 0) {
        vardate["year"] = dt.get('year');
    }
    return vardate;
}

function addHistory(id, itemId, name) {
    buildhistory.unshift({id: id, itemId: itemId, name: name, date: Date.now()});
    if (buildhistory.length > 50) {
        buildhistory.pop();
    }
    chrome.storage.local.set({'buildhistory': buildhistory});
}

function supportedCollection() {
    if ($('#exponoffswitch').prop('checked')) {
        return (tablink.contains("/collection-"));
    } else {
        return (tablink.contains("/collection-1/"));
    }
}

function getParameterByName(name, url) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(url);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function reverseRelationship(relationship) {
    if (relationship === "wife") {
        return "husband";
    } else if (relationship === "husband") {
        return "wife";
    } else if (relationship === "son" || relationship === "daughter" || relationship === "child" || relationship === "children") {
        if (focusgender === "male") {
            return "father";
        } else if (focusgender === "female") {
            return "mother";
        } else {
            return "parent";
        }
    } else if (relationship === "parents" || relationship === "parent" || relationship === "father" || relationship === "mother") {
        if (focusgender === "male") {
            return "son";
        } else if (focusgender === "female") {
            return "daughter";
        } else {
            return "child";
        }
    } else if (relationship === "siblings" || relationship === "sibling" || relationship === "sister" || relationship === "brother") {
        if (focusgender === "male") {
            return "brother";
        } else if (focusgender === "female") {
            return "sister";
        } else {
            return "sibling";
        }
    } else if (relationship === "partner") {
        return "partner";
    } else if (relationship === "ex-wife") {
        return "ex-husband";
    } else if (relationship === "ex-husband") {
        return "ex-wife";
    } else if (relationship === "ex-partner") {
        return "ex-partner";
    } else {
        return "";
    }
}

// ----- Persistent Options -----
$(function () {
    $('#privateonoffswitch').on('click', function() {
        chrome.storage.local.set({'autoprivate': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            if(profilegroup[group].checked) { //only check it if the section is checked
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        if ($(privateprofiles[profile]).next().text().startsWith("\<Private\>")) {
                            $(privateprofiles[profile]).prop('checked', !this.checked);
                            var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                            fs.find(':checkbox').prop('checked', !this.checked);
                            fs.find('input:text').attr('disabled', this.checked);
                        }
                    }
                }
            }
        }
    });
    $('#geoonoffswitch').on('click', function () {
        chrome.storage.local.set({'autogeo': this.checked});
        geoonoff(this.checked);
        hideempty($('#hideemptyonoffswitch').prop('checked'));
    });
    function geoonoff(value) {
        if (value) {
            var locobj = document.getElementsByClassName("geoloc");
            for (var i=0;i < locobj.length; i++) {
                locobj[i].style.display = "table-row";
                var pinput = $(locobj[i]).find(":input:text");
                pinput.filter(function(item) {
                    var checkbox = $(pinput[item]).closest("tr").find(":input:checkbox");
                    return (pinput[item].value !== "" && checkbox.checked);
                }).prop("disabled", false);
            }
            var placeobj = document.getElementsByClassName("geoplace");
            for (var i=0;i < placeobj.length; i++) {
                placeobj[i].style.display = "none";
                //$(placeobj[i]).find(":input:text").prop("disabled", true);
            }
            $(".geoicon").attr("src", "images/geoon.png");
        } else {
            var locobj = document.getElementsByClassName("geoloc");
            for (var i=0;i < locobj.length; i++) {
                locobj[i].style.display = "none";
                //$(locobj[i]).find(":input:text").prop("disabled", true);
            }
            var placeobj = document.getElementsByClassName("geoplace");
            for (var i=0;i < placeobj.length; i++) {
                placeobj[i].style.display = "table-row";
                var pinput = $(placeobj[i]).find(":input:text");
                pinput.filter(function(item) {
                    var checkbox = $(pinput[item]).closest("tr").find(":input:checkbox");
                    return (pinput[item].value !== ""  && checkbox.checked);
                }).prop("disabled", false);
            }
            $(".geoicon").attr("src", "images/geooff.png");
        }
    }
    $('#birthonoffswitch').on('click', function() {
        chrome.storage.local.set({'autobirth': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            if(profilegroup[group].id === "addchildck" || profilegroup[group].id === "addsiblingck") {
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var lname = fs.find('[name="last_name"]')[0];
                        var bname = fs.find('[name="maiden_name"]')[0];
                        if (this.checked) {
                            if (bname.value === "") {
                                bname.value = lname.value;
                            }
                        } else {
                            if (bname.value === lname.value) {
                                bname.value = "";
                            }
                        }
                    }
                }
            } else if (profilegroup[group].id === "addparentck" || profilegroup[group].id === "addpartnerck") {
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var genderobj = fs.find('[name="gender"]')[0];
                        var gender = genderobj.options[genderobj.selectedIndex].value;
                        if (gender === "male") {
                            var lname = fs.find('[name="last_name"]')[0];
                            var bname = fs.find('[name="maiden_name"]')[0];
                            if (this.checked) {
                                if (bname.value === "") {
                                    bname.value = lname.value;
                                }
                            } else {
                                if (bname.value === lname.value) {
                                    bname.value = "";
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    $('#mnameonoffswitch').on('click', function () {
        chrome.storage.local.set({'automname': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
            for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) &&  privateprofiles[profile].name.startsWith("checkbox")) {
                    if (exists($(privateprofiles[profile]).next()[0])) {
                        var name = NameParse.parse($(privateprofiles[profile]).next()[0].text, this.checked);
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var fname = fs.find('[name="first_name"]')[0];
                        var mname = fs.find('[name="middle_name"]')[0];
                        fname.value = name.firstName;
                        mname.value = name.middleName;

                    }
                }
            }

        }
    });
    $('#exponoffswitch').on('click', function () {
        chrome.storage.local.set({'excollection': this.checked});
    });
    $('#sourceonoffswitch').on('click', function () {
        chrome.storage.local.set({'addsource': this.checked});
    });
    $('#geniparentonoffswitch').on('click', function () {
        chrome.storage.local.set({'geniparent': this.checked});
        $("#gparentchange").css("display", "block");
        //TODO Make this a live change
    });
    $('#burialonoffswitch').on('click', function () {
        chrome.storage.local.set({'burialdate': this.checked});
        $("#burialchange").css("display", "block");
        //TODO Make this a live change
    });
    $('#hideemptyonoffswitch').on('click', function () {
        chrome.storage.local.set({'hideempty': this.checked});
        if (!this.checked) {
            document.getElementById("profiledata").style.display = "block";
        } else if (hideprofile) {
            document.getElementById("profiledata").style.display = "none";
        }
        hideempty(this.checked);
    });
    function hideempty(value) {
        if (value) {
            $('#formdata').find(".hiddenrow").css("display", "none");
        } else {
            $('#formdata').find(".hiddenrow").css("display", "table-row");
            geoonoff($('#geoonoffswitch').prop('checked'));
        }
    }
});

chrome.storage.local.get('autogeo', function (result) {
    var geochecked = result.autogeo;
    if(exists(geochecked)) {
        $('#geoonoffswitch').prop('checked', geochecked);
    }
});

chrome.storage.local.get('autoprivate', function (result) {
    var privatechecked = result.autoprivate;
    if(exists(privatechecked)) {
        $('#privateonoffswitch').prop('checked', privatechecked);
    }
});

chrome.storage.local.get('autobirth', function (result) {
    var birthchecked = result.autobirth;
    if(exists(birthchecked)) {
        $('#birthonoffswitch').prop('checked', birthchecked);
    }
});

chrome.storage.local.get('automname', function (result) {
    var mnamechecked = result.automname;
    if(exists(mnamechecked)) {
        $('#mnameonoffswitch').prop('checked', mnamechecked);
    }
});

chrome.storage.local.get('hideempty', function (result) {
    var hidechecked = result.hideempty;
    if(exists(hidechecked)) {
        $('#hideemptyonoffswitch').prop('checked', hidechecked);
    }
});

chrome.storage.local.get('excollection', function (result) {
    var experimental = result.excollection;
    if(exists(experimental)) {
        $('#exponoffswitch').prop('checked', experimental);
    }
});

chrome.storage.local.get('burialdate', function (result) {
    var burialchecked = result.burialdate;
    if(exists(burialchecked)) {
        $('#burialonoffswitch').prop('checked', burialchecked);
    }
});

chrome.storage.local.get('geniparent', function (result) {
    var gparentchecked = result.geniparent;
    if(exists(gparentchecked)) {
        $('#geniparentonoffswitch').prop('checked', gparentchecked);
    }
});

chrome.storage.local.get('addsource', function (result) {
    var sourcechecked = result.addsource;
    if(exists(sourcechecked)) {
        $('#sourceonoffswitch').prop('checked', sourcechecked);
    }
});