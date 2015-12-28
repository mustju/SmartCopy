// Parse Ancestry (person.ancestry.com)
function parseAncestryNew(htmlstring, familymembers, relation) {
    relation = relation || "";

    var parsed = $(htmlstring.replace(/<img/ig, "<gmi"));
    var par = parsed.find("#personCard");
    var focusperson = par.find(".userCardTitle").text();
    var focusdaterange = par.find(".userCardSubTitle").text().replace("&ndash;", " - ");

    document.getElementById("readstatus").innerText = focusperson;
    var profiledata = {};
    var genderval = "unknown";
    var burialdtflag = false;
    var buriallcflag = false;
    var deathdtflag = false;
    var aboutdata = "";

    var usercard = parsed.find(".cardSubtitle");

    for (var i = 0; i < usercard.length; i++) {
        var entry = $(usercard[i]);
        var titlename = entry.text();
        if (titlename === "Birth") {
            var data = parseAncestryNewDate(entry.next());
            if (!$.isEmptyObject(data)) {
                profiledata["birth"] = data;
            }
        } else if (titlename === "Death") {
            var data = parseAncestryNewDate(entry.next());
            if (!$.isEmptyObject(data)) {
                if (exists(getDate(data))) {
                    deathdtflag = true;
                }
                profiledata["death"] = data;
            }
        } else if (titlename === "Baptism") {
            var data = parseAncestryNewDate(entry.next());
            if (!$.isEmptyObject(data)) {
                profiledata["baptism"] = data;
            }
        } else if (titlename === "Burial") {
            var data = parseAncestryNewDate(entry.next());
            if (!$.isEmptyObject(data)) {
                if (exists(getDate(data))) {
                    burialdtflag = true;
                }
                if (exists(getLocation(data))) {
                    buriallcflag = true;
                }
                profiledata["burial"] = data;
            }
        } else if (titlename === "Gender") {
            var gen = entry.next().text().toLowerCase();
            if (isMale(gen) || isFemale(gen)) {
                genderval = gen;
            }
        } else if (!familymembers && titlename === "Marriage" && exists(relation.title) && isPartner(relation.title)) {
            var url = entry.next().next().find("a").attr("href");
            if (exists(url)) {
                var sid = parseAncestryNewId(url);
                if (sid === focusURLid) {
                    var data = parseAncestryNewDate(entry.next());
                    if (!$.isEmptyObject(data)) {
                        profiledata["marriage"] = data;
                    }
                }
            }

        } else if (!familymembers && titlename === "Marriage" && exists(relation.title) && isParent(relation.title)) {
            var url = entry.next().next().find("a").attr("href");
            if (exists(url)) {
                var sid = parseAncestryNewId(url);
                if (parentmarriageid === "") {
                    parentmarriageid = sid;
                } else if (sid !== parentmarriageid) {
                    var data = parseAncestryNewDate(entry.next());
                    if (!$.isEmptyObject(data)) {
                        profiledata["marriage"] = data;
                    }
                }
            }
        }
    }

    profiledata["name"] = focusperson;
    profiledata["gender"] = genderval;
    profiledata["status"] = relation.title;

    var usrimg = par.find("gmi");

    if (usrimg.length > 1) {
        var image = $(usrimg[1]).attr("src");
    }

    if (exists(image) && !image.endsWith("puy35qab_original.jpg")) {
        profiledata["thumb"] = image.replace("&maxHeight=280", "&maxWidth=152");
        profiledata["image"] = image.replace("&maxHeight=280", "");
    }

    if (relation === "") {
        focusgender = genderval;
    }

    if (familymembers) {
        loadGeniData();
        var famid = 0;
    }

    // ---------------------- Family Data --------------------

    var familydata = parsed.find(".familySection");
    var memberfam = familydata.find(".factsSubtitle");
    var memberfam2 = familydata.find(".toggleSiblings");
    if (memberfam2.length > 0) {
        memberfam2[0].innerHTML = "siblings " + memberfam2[0].innerHTML;
        memberfam.push.apply(memberfam, memberfam2);
    }

    for (var i = 0; i < memberfam.length; i++) {
        var headtitle = $(memberfam[i]).text().toLowerCase();
        if (headtitle.startsWith("siblings")) {
            headtitle = "siblings";
            var person = $(memberfam[i]).find("a");
        } else {
            var person = $(memberfam[i]).next().find("a");
        }

        for (var x = 0; x < person.length; x++) {
            var title = headtitle;
            var url = $(person[x]).attr("href");
            if (title === "spouse & children") {
                if ($(person[x]).prop('outerHTML').contains("ResearchSpouse")) {
                    title = "spouse";
                } else {
                    title = "child";
                }
            }

            if (exists(url)) {
                var itemid = parseAncestryNewId(url);
                if (familymembers) {
                    var name = $(person[x]).find(".userCardTitle").text();
                    getAncestryNewTreeFamily(famid, itemid, name, title, url);
                    famid++;
                } else if (exists(relation.title) && isChild(relation.title)) {
                    if (focusURLid !== itemid) {
                        childlist[relation.proid] = $.inArray(itemid, unionurls);
                        profiledata["parent_id"] = $.inArray(itemid, unionurls);
                    }
                }
            }
        }
    }

    // ---------------------- Profile Data --------------------
    if (focusdaterange !== "") {
        profiledata["daterange"] = focusdaterange;
    }

    if (!burialdtflag && buriallcflag && deathdtflag && $('#burialonoffswitch').prop('checked')) {
        profiledata = checkBurial(profiledata);
    }

    if (aboutdata.trim() !== "") {
        profiledata["about"] = cleanHTML(aboutdata);
        // "\n--------------------\n"  Merge separator
    }

    if (familymembers) {
        alldata["profile"] = profiledata;
        alldata["scorefactors"] = smscorefactors;
        updateGeo();
    }

    return profiledata;
}


function parseAncestryNewDate(vitalinfo) {
    var data = [];
    var dmatch = vitalinfo.find(".factItemDate").text();
    if (exists(dmatch)) {
        var dateval = dmatch.replace(",", "").replace(".", "").trim();
        dateval = cleanDate(dateval);
        if (dateval !== "") {
            data.push({date: dateval});
        }
    }
    var lmatch = vitalinfo.find(".factItemLocation").text();
    if (exists(lmatch)) {
        var eventlocation = lmatch.trim().replace(/^in/, "").trim();
        if (eventlocation !== "") {
            data.push({id: geoid, location: eventlocation});
            geoid++;
        }
    }
    return data;
}

function parseAncestryNewId(url) {
    return url.substring(url.lastIndexOf('/') + 1);
}


function getAncestryNewTreeFamily(famid, itemid, name, title, url) {
    var gendersv = "unknown";
    var halfsibling = false;
    if (title === "half siblings") {
        halfsibling = true;
        title = "sibling";
    }
    var subdata = {name: name, title: title, halfsibling: halfsibling, gender: gendersv, url: url, itemId: itemid, profile_id: famid};
    if (!exists(alldata["family"][title])) {
        alldata["family"][title] = [];
    }
    unionurls[famid] = itemid;
    if (isParent(title)) {
        parentlist.push(itemid);
    } else if (isPartner(title)) {
        myhspouse.push(famid);
    }
    familystatus.push(famid);
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: url,
        variable: subdata
    }, function (response) {
        var arg = response.variable;
        var person = parseAncestryNew(response.source, false, {"title": arg.title, "proid": arg.profile_id, "itemId": arg.itemId});
        if (person === "") {
            familystatus.pop();
            return;
        }
        if (arg.halfsibling) {
            person["halfsibling"] = true;
        }
        person = updateInfoData(person, arg);
        databyid[arg.profile_id] = person;
        alldata["family"][arg.title].push(person);
        familystatus.pop();
    });
}